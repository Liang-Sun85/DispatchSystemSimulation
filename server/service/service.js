'use strict'
const OrderProcess = require('./OrderProcess');
const PathResource = require('./PathResource');
const VehiclesService = require('./VehiclesService');
const {logger} = require('../utils/MyLogger');
const IoHelper = require('../utils/IoHelper');

const Service = {
  start(io) {
    logger.info('Service start.');
    this.MapService = require('./MapService');
    this.VehiclesService = new VehiclesService(this.MapService, (msg) => { this.vehicleCallback(msg); });
    this.OrderService = require('./OrderService');
    this.ioHelper = new IoHelper(io, this);
    this.hasOrders = false;

    this.vehicleOrderMap = new Map();
    this.orderProcessMap = new Map();
    this.lowBatteryVehicle = new Map();

    this.MapService.start().then(() => {
      let smap = this.MapService.getCurrentMap();
      if (smap) {
        this.trafficResource = new PathResource(smap);
      }
    })

    setTimeout(() => { this.orderFilter(); }, 2000);
  },

  vehicleCallback(msg) {
    console.log(msg);
    if (msg.msg == 'charge') {
      //this.newChargingOrder(msg.vehicle_id, msg.current_station);
      this.addLowBatteryVehicle(msg.vehicle_id);
    } else if (msg.msg == 'park') {
      this.lowBatteryVehicle.delete(msg.vehicle_id);
      this.newParkingOrder(msg.vehicle_id);
    } else if (msg.msg == 'init_position') {
      let current_station_type = this.MapService.getStationType(msg.current_station);
      if (current_station_type == 'ParkPoint') {
        this.MapService.requestParkPoint(msg.current_station);
      } else if(current_station_type == 'ChargePoint') {
        this.MapService.requestChargePoint(msg.current_station);
      }
    }
  },

  OrderProcessFinishCB(msg) {
    logger.info(msg);
    let orderName = this.vehicleOrderMap.get(msg.vehicle_id);
    this.orderProcessMap.delete(orderName);
    this.vehicleOrderMap.delete(msg.vehicle_id);

    if (msg.msg == 'finish') {
      this.handleOrderFinish(msg);
    } else if (msg.msg == 'withdraw') {
      this.OrderService.getOrder(msg.orderName).then((order) => {
        let destination = order.destinations[order.destinations.length - 1].locationName;
        logger.info('Destination station is ' + destination);
        console.log(order.category);
        if (order.category == 'Park') {
          this.MapService.releaseParkPoint(destination);
        } else if (order.category == 'Charge') {
          this.MapService.releaseChargePoint(destination);
        }

        let dispatchableOrders = this.OrderService.getDispatchableOrders();
        if (dispatchableOrders.length == 0) { // no dispatchable order, go to ParkPoint
          logger.info('No transport orders available.');
          logger.info('Send vehicle ' +  msg.vehicle_id + ' to parking positions.');
          this.newParkingOrder(msg.vehicle_id);
        }
      });
    }
  },

  handleOrderFinish(msg) {
    let current_station_type = this.MapService.getStationType(msg.current_station);
    logger.info('The current station is ' +  current_station_type);
    if (current_station_type != 'ParkPoint' && current_station_type != 'ChargePoint') { // order finished & vehicle not at ParkPoint or ChargePoint
      let vehicle = this.VehiclesService.getVehicle(msg.vehicle_id);
      let battery_level = vehicle.getBattery_level();
      logger.info('Vehicle battery level is ' +  battery_level);
      if (battery_level < 0.3) {
        if(this.MapService.hasEmptyChargePoint()) {
          logger.info('There are some charge points available...');
          this.newChargingOrder(msg.vehicle_id);
        } else {
          logger.info('Now there is no charge point available...');
          this.addLowBatteryVehicle(msg.vehicle_id);
          this.newParkingOrder(msg.vehicle_id);
        }
      } else {
        let dispatchableOrders = this.OrderService.getDispatchableOrders();
        if (dispatchableOrders.length == 0) { // no dispatchable order, go to ParkPoint
          logger.info('There are no transport order to dispatch.');
          this.newParkingOrder(msg.vehicle_id);
        }
      }
    }
  },

  addLowBatteryVehicle(vehicle_id) {
    this.lowBatteryVehicle.set(vehicle_id, true);
    if(this.lowBatteryVehicle.size == 1){
      setTimeout(() => { this.checkLowBatteryVehicle(); }, 3000);
    }
  },

  checkLowBatteryVehicle() {
    logger.info('Start to check low battery Vehicles...');
    if(this.lowBatteryVehicle.size > 0) {
      logger.info('Start to check empty charge points...');
      if(this.MapService.hasEmptyChargePoint()) {
        let vehicle_id = null;
        for (let [key,value] of this.lowBatteryVehicle) {
          if(value == true) {
            vehicle_id = key;
            break;
          }
        }
        logger.info('To charge Vehicle is ' + vehicle_id);
        if(vehicle_id) {
          this.newChargingOrder(vehicle_id);
          //this.lowBatteryVehicle.delete(vehicle_id);
          this.lowBatteryVehicle.set(vehicle_id, false);
        }
      }
      setTimeout(() => { this.checkLowBatteryVehicle(); }, 3000);
    }
  },

  orderFilter() {
    logger.info('Check new transport orders periodically...');
    let dispatchableOrders = this.OrderService.getDispatchableOrders();
    if (dispatchableOrders.length > 0) {
      this.hasOrders = true;
      let order = dispatchableOrders[0];
      logger.info('Trying to find vehicle for transport order ' + order.name);
      let vehicle = this.VehiclesService.getDispatchVehicle(order.intendedVehicle, order);
      if (vehicle != null) {
        logger.info('Assigning vehicle ' + vehicle.getVehicle_id() + ' to order ' + order.name);
        let currentOrderName = this.vehicleOrderMap.get(vehicle.getVehicle_id());
        if (currentOrderName) {
          if (this.orderProcessMap.get(currentOrderName).getOrderCategory() == 'Park') {
            this.orderProcessMap.get(currentOrderName).withdraw();
            order.intendedVehicle = vehicle.getVehicle_id();
            this.OrderService.update(order.name, 'intendedVehicle', vehicle.getVehicle_id());
          }
        } else {
          this.vehicleOrderMap.set(vehicle.getVehicle_id(), order.name);
          logger.info(vehicle.getVehicle_id() + ' start to process ' + order.name);
          let process = new OrderProcess(vehicle, order, this.OrderService, this.MapService, this.trafficResource, (msg) => { this.OrderProcessFinishCB(msg); });
          this.orderProcessMap.set(order.name, process);
          process.processing();
        }
      }
      setTimeout(() => { this.orderFilter(); }, 1000);
    } else {
      this.hasOrders = false;
    }
  },

  checkOrder(order) {
    // check transport order valid
    /*for (let key in order) {
      if (!order[key]) {
        return 'RAW';
      }
    }*/
    // TODO : check required parameter

    // check routable
    let destinationList = [];
    for (let i = 0; i < order.destinations.length; i++) {
      destinationList[i] = order.destinations[i].locationName;
    }
    if (destinationList.length == 1) {
      return this.MapService.isStationInMap(destinationList[0]) ? 'DISPATCHABLE' : 'UNROUTABLE';
    } else {
      for (let i = 0; i < destinationList.length - 1; i++) {
        if (this.MapService.isStationInMap(destinationList[i]) && this.MapService.isStationInMap(destinationList[i + 1])) {
          if (this.MapService.getPath(destinationList[i], destinationList[i + 1]).length == 0, null) {
            return 'UNROUTABLE';
          }
        } else {
          return 'UNROUTABLE';
        }
      }
      return 'DISPATCHABLE';
    }
  },

  newChargingOrder(vehicle_id) {
    let vehicle = this.VehiclesService.getVehicle(vehicle_id);
    if(vehicle) {
      let destination = this.MapService.getNearestStation(vehicle.getCurrent_station(), 'ChargePoint', vehicle.getPosition());
      let order = {
        category: "Charge",
        intendedVehicle: vehicle_id,
        destinations: [
          { locationName: destination, operation: "charge" }
        ]
      };
      let name = 'Charge-' + Date.now();
      this.newOrder(name, order);
    }
  },

  newParkingOrder(vehicle_id) {
    logger.info('Creates parking orders for vehicle ' + vehicle_id);
    let vehicle = this.VehiclesService.getVehicle(vehicle_id);
    if(vehicle) {
      let destination = this.MapService.getNearestStation(vehicle.getCurrent_station(), 'ParkPoint', vehicle.getPosition());
      logger.info('The available parking point is ' + destination);
      let order = {
        category: "Park",
        intendedVehicle: vehicle_id,
        destinations: [
          { locationName: destination, operation: [{"action": "park"}]}
        ]
      };
      let name = 'Park-' + Date.now();
      this.newOrder(name, order);
    }
  },

  // API for TransportOrders --------------------------------------------------------
  newOrder(name, order) {
    logger.info('neworder : '+JSON.stringify(order));
    return new Promise((resolve, reject) => {
      let state = this.checkOrder(order);
      if (state != 'DISPATCHABLE') {
        reject({ code: 404, msg: "Transport order is not valid, reason = " + state });
      }
      this.OrderService.newOrder(name, state, order).then((code) => {
        resolve(code);
        if (this.hasOrders == false) {
          this.orderFilter();
        }
      }).catch((err) => {
        reject(err);
      });
    });
  },

  withdrawOrder(name, immediate) {
    return new Promise((resolve, reject) => {
      //if (immediate) {
        let processOrder = this.orderProcessMap.get(name);
        if(processOrder) {
          processOrder.withdraw();
        }
        this.OrderService.withdrawOrder(name).then((code) => {
          resolve(code);
        }).catch((err) => {
          reject(err);
        })
      //}
    })
  },

  // API for Vehicles --------------------------------------------------------
  withdrawalTransportOrder(vehicle_id, immediate, disableVehicle) {
    return new Promise((resolve, reject) => {
      if (this.VehiclesService.getVehicle(vehicle_id) != null) {
        let orderName = this.vehicleOrderMap.get(vehicle_id); 
        let processOrder = this.orderProcessMap.get(orderName);
        if(processOrder) {
          processOrder.withdraw();
        }
        this.OrderService.withdrawOrder(orderName).then((code) => {
          resolve(code);
        }).catch((err) => {
          reject(err);
        })
      } else {
        reject({code: 404 , msg: "Unknown vehicle " + vehicle_id});
      }
    })
  },

  runningDriveOrder() {
    let driveOrders = [];
    this.vehicleOrderMap.forEach((orderName, vehicle_id) => {
      let route = this.orderProcessMap.get(orderName).getCurrentRoute();
      if (route) {
        let driveOrder = {vehicle_id:vehicle_id, route:route};
        driveOrders.push(driveOrder);
      }
    });
    /*this.orderProcessMap.forEach((orderProcess, orderName) => {
      let driveOrder = orderProcess.getCurrentRoute();
      if (driveOrder) {
        driveOrders.push(driveOrder);
      }
    })*/
    return driveOrders;
  }
};

module.exports = Service;