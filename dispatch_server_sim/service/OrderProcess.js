const {logger} = require('../utils/MyLogger');

class OrderProcess {
  constructor(vehicle, order, OrderService, MapService, trafficResource, finishCallback) {
    this.vehicle = vehicle;
    this.transportOrder = order;
    this.orderService = OrderService;
    this.MapService = MapService;
    this.trafficResource = trafficResource;
    this.finishCallback = finishCallback;
    this.sourceNode = this.vehicle.getCurrent_station();
    this.generateDriverOrders();

    this.refreashMap();

    this.visitedStation = new Map();

    this.intentStatus = 0;
    this.driveOrderIdx = -1;
    this.stepIdx = -1;
    this.withdrawFlag = false;
  };

  getOrderCategory() {
    return this.transportOrder.category;
  }

  getCurrentRoute() {
    if (this.driveOrderIdx >= 0) {
      return this.driveOrders[this.driveOrderIdx].route.steps;
    } else {
      return null;
    }
  }

  refreashMap(){
    let finalStation = this.driveOrders[this.driveOrders.length - 1].destination.locationName;
    if(this.transportOrder.category == 'Park') {
      this.MapService.requestParkPoint(finalStation);
    } else if(this.transportOrder.category == 'Charge') {
      this.MapService.requestChargePoint(finalStation);
    }
  }

  generateDriverOrders() {
    this.driveOrders = [];
    let task_id = new Date().getTime().toString();
    this.transportOrder.destinations.forEach((destination) => {
      let driveOrder = { destination: destination , task_id: task_id};
      this.driveOrders.push(driveOrder);
      task_id++;
    });
    this.generateRoute();
  }

  generateRoute() {
    let sourceNode = this.sourceNode;
    this.driveOrders.forEach((driveOrder) => {
      let pathList = this.MapService.getPath(sourceNode, driveOrder.destination.locationName, this.vehicle.getPosition());
      logger.info('The sequence of destinations to visit are ' + pathList);
      let steps = this.generateSteps(pathList);
      let route = { steps: steps };
      driveOrder.route = route;
      sourceNode = driveOrder.destination.locationName;
    });
    console.log(this.driveOrders);
    console.log(this.driveOrders[0].route);
  }

  generateSteps(pathList) {
    let steps = [];
    for (let i = 0; i < pathList.length - 1; i++) {
      let start = pathList[i];
      let end = pathList[i + 1];
      let path = start + '-' + end;
      let step = { path: path, start: start, end: end };
      steps.push(step);
    }
    return steps;
  }

  processing() {
    let vehicle_id = this.vehicle.getVehicle_id();
    let task_status = this.vehicle.getTask_status();
    let current_station = this.vehicle.getCurrent_station();

    if (this.transportOrder.state == 'DISPATCHABLE') {
      this.transportOrder.state = 'BEING_PROCESSED';
      this.orderService.updateState(this.transportOrder.name, 'BEING_PROCESSED');
      this.orderService.update(this.transportOrder.name, 'processingVehicle', vehicle_id);
    }
    logger.info('Vehicle ' + vehicle_id + ' at ' + current_station +', vehicle status is '+ task_status + '; system intentStatus is '+ this.intentStatus);
    
    if (this.intentStatus == 2 && this.vehicle.getTask_status() != 2) {// task_status sync?
      this.timeout = setTimeout(() => { this.processing(); }, 500);
      return;
    }

    switch (this.vehicle.getTask_status()) {
      case 0: // IDLE (TransportOrder start or finish)
        if(this.withdrawFlag) {
          clearTimeout(this.timeout);
          this.transportOrder.state == 'WITHDRAWN';
          this.orderService.updateState(this.transportOrder.name, 'WITHDRAWN');
          this.trafficResource.releaseVehicleFlow(this.vehicle.getVehicle_id());
          let msg = { vehicle_id: this.vehicle.getVehicle_id(), current_station: this.vehicle.getCurrent_station(), orderName:this.transportOrder.name, msg: 'withdraw' };
          this.finishCallback(msg);
          return;
        }
        let finalStation = this.driveOrders[this.driveOrders.length - 1].destination.locationName;
        if (current_station == finalStation && this.driveOrderIdx != -1) {
          //withdrawOperationVehicle(this.trafficResource.resourceSet, vehicleId);
          //this.trafficResource.releaseAllFlow(vehicleId);
          this.transportOrder.state = 'FINISHED';
          this.orderService.updateState(this.transportOrder.name, 'FINISHED');
          logger.info('The current transport order ' + this.transportOrder.name + ' has been finished.');
          let msg = { vehicle_id: vehicle_id, current_station: current_station, orderName:this.transportOrder.name, msg: 'finish' };
          this.finishCallback(msg);
          return;
        } else {
          let current_station_type = this.MapService.getStationType(current_station);
          if (current_station_type == 'ParkPoint') {
            this.MapService.releaseParkPoint(current_station);
          } else if (current_station_type == 'ChargePoint') {
            this.MapService.releaseChargePoint(current_station);
          }
          this.driveOrderIdx++;
          if (this.requireNextStep()) {
            this.goNextStep();
          } else {
            this.driveOrderIdx--;
          }
        }
        break;
      case 2: // running
        if(this.withdrawFlag) {
          break;
        }
        let currentStep = this.driveOrders[this.driveOrderIdx].route.steps[this.stepIdx];
        if (this.vehicle.getCurrent_station() == currentStep.start) {
          this.visitedStation.set(currentStep.start, true);
        }
        if (this.vehicle.getLast_station() == currentStep.start && this.visitedStation.get(currentStep.start)) { // leave start station of current Step, require next Step
          this.releaseResource(currentStep);
          if (this.driveOrders[this.driveOrderIdx].route.steps[this.stepIdx + 1]) { // has next step
            if (this.requireNextStep()) { // next step is valid, send it to vechile
              this.goNextStep();
            } else {  // next step is not valid, suspend vechile
              this.vehicle.pauseTask();
              this.intentStatus = 3;
            }
          } else if (this.vehicle.getCurrent_station() == this.driveOrders[this.driveOrderIdx].destination.locationName) {
            this.intentStatus = 4;
          }
        }
        break;
      case 3: // suspend
        if (this.vehicle.getLast_station() == this.driveOrders[this.driveOrderIdx].route.steps[this.stepIdx].start) {
          if (this.driveOrders[this.driveOrderIdx].route.steps[this.stepIdx + 1]) { // has next step
            if (this.requireNextStep()) { // next step is valid, resume
              this.vehicle.resumeTask();
              this.intentStatus = 2;
            }
          }
        }
        break;
      case 4: // finish this DriveOrder
        if (this.driveOrders[this.driveOrderIdx + 1]) {
          this.driveOrderIdx++;
          this.stepIdx = -1;
          if (this.requireNextStep()) {
            this.goNextStep();
          } else {
            this.driveOrderIdx--;
          }
        }
        break;
      default:
        break;
    }
    this.timeout = setTimeout(() => { this.processing(); }, 500);
  }

  releaseResource(step) {
    this.trafficResource.releaseRelatedFlow(this.vehicle.getVehicle_id(), step);
  }

  requireNextStep() {
    let nextStep = this.driveOrders[this.driveOrderIdx].route.steps[this.stepIdx + 1];
    logger.info('requireNextStep:' + nextStep.path);
    return this.trafficResource.requireResource(this.vehicle.getVehicle_id(), nextStep.path);
  }

  goNextStep() {
    if (this.intentStatus == 3) {
      this.vehicle.resumeTask();
      this.intentStatus = 2;
      return;
    }
    let nextStep = this.driveOrders[this.driveOrderIdx].route.steps[this.stepIdx + 1];
    let destination = null;
    let parking_mark = false;
    if (this.driveOrderIdx == this.driveOrders.length - 1 && this.stepIdx == this.driveOrders[this.driveOrderIdx].route.steps.length - 2) {
      parking_mark = true;
    }
    let message = { source_id: nextStep.start, id: nextStep.end, valid: true, parking_mark: parking_mark };
    logger.info('Assigning to Vehicle source_id: ' + nextStep.start + ' id: ' + nextStep.end + ' valid: ' + true + ' parking_mark: ' + parking_mark);
    if (this.driveOrders[this.driveOrderIdx].destination.locationName == nextStep.end) {
      destination = this.driveOrders[this.driveOrderIdx].destination;
    }
    if (destination) {
      Object.assign(message, destination);
      delete message.locationName;
    }

    if (this.stepIdx == -1) { // first step
      this.driveOrders[this.driveOrderIdx].task_id = new Date().getTime().toString();
      let station_list = [nextStep.start];
      this.driveOrders[this.driveOrderIdx].route.steps.forEach(step => {
        station_list.push(step.end);
      })
      this.vehicle.sendTargetList(station_list, this.driveOrders[this.driveOrderIdx].task_id);
    } else {
      this.vehicle.goNextStep(message)
    }

    this.stepIdx++;
    this.intentStatus = 2;
  }

  withdraw() {
    this.vehicle.cancelTask();
    this.withdrawFlag = true;
    this.intentStatus = 0;
    //clearTimeout(this.timeout);
    //this.transportOrder.state == 'WITHDRAWN';
    //this.orderService.updateState(this.transportOrder.name, 'WITHDRAWN');
    //this.trafficResource.releaseVehicleFlow(this.vehicle.getVehicle_id());

    //let msg = { vehicle_id: this.vehicle.getVehicle_id(), current_station: this.vehicle.getCurrent_station(), orderName:this.transportOrder.name, msg: 'withdraw' };
    //this.finishCallback(msg);
  }
}

/*function withdrawOperationVehicle(trafficResource, vehicleId) {
  trafficResource.forEach((link) => {
    let pathFlow = link.flow;
    for (let i = 0; i < pathFlow.length; i++) {
      if (pathFlow[i] == vehicleId) {
        pathFlow.splice(i, 1);
        break;
      }
    }
  })
}*/

module.exports = OrderProcess;