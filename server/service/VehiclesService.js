'use strict'
const DbHelper = require('../utils/DbHelper');
const MySocketHelper = require('../utils/MySocketHelper');
const Vehicle = require('./Vehicle');
const {logger} = require('../utils/MyLogger');

class VehiclesService {
  constructor(MapService, cb) {
    this.MapService = MapService;
    this.msgCB = cb;
    this.bot_db = new DbHelper('./data/bot'); //初始化数据库
    this.socketHelper = new MySocketHelper((port, ping, cmd, data) => { this.SocketHandler(port, ping, cmd, data); }); //初始化socket

    this.botMap = new Map();
    this.botList = [];

    this.chargingBots = new Map();
    this.parkingBots = new Map();

    this.bot_db.find({}, { _id: 0 }).then((doc) => {
      doc.forEach((item) => {
        let bot = new Vehicle(item.id, this.socketHelper);
        bot.setStatus(item);
        this.botList.push(bot);
      });
      this.pollVehicles();
    }); // 数据库中读出AGV列表，并初始化在线状态为offline

    //setTimeout(()=>{this.pollVehicles();},1000); // 1秒后UDP广播查找AGV
  }

  /*setCallback(cb) {
    this.msgCB = cb;
  }*/

  SocketHandler(port, ping, cmd, data) {
    //console.log("SocketHandler, port=" + port + ",ping=" + ping + ", cmd=" + cmd + ", data=");
    //console.log(data);
    switch (cmd) {
      case 0: // UDP广播响应，更新AGV列表，并直接TCP连接
        this.addVehicle(data);
        break;
      case 1: // TCP 连接/断开
        if (data.connection == 'ok') {
          logger.info('TCP connecting...');
          for (let i = 0; i < this.botList.length; i++) {
            if (this.botList[i].getPort() == port) {
              this.botList[i].setNetStatus('connected');
              this.botMap.set(port, this.botList[i]);
              break;
            }
          }
        } else {
          logger.info('TCP disconnecting...');
          if (this.botMap.get(port)) {
            this.botMap.get(port).setNetStatus('offline');
            this.botMap.delete(port);
          }
        }
        console.log(this.botMap);
        break;
      case 11004:
        if (this.botMap.has(port)) {
          let vehicle = this.botMap.get(port);
          vehicle.handleSocket(ping, cmd, data);
          this.msgCB({vehicle_id:vehicle.getVehicle_id(), msg: 'init_position', current_station: data.current_station});
        }
        break;
      case 19301:
        if (this.botMap.has(port)) {
          this.checkBattery(data);
          this.botMap.get(port).handleSocket(ping, cmd, data);
        }
        break;
      default:
        if (this.botMap.has(port)) {
          this.botMap.get(port).handleSocket(ping, cmd, data);
        }
        break;
    }
  }

  checkBattery(data) {
    if (data.battery_level < 0.1 && data.task_status == 0 && !this.chargingBots.has(data.vehicle_id)) {
      this.chargingBots.set(data.vehicle_id, false);
      this.msgCB({ vehicle_id: data.vehicle_id, msg: 'charge', current_station: data.current_station });
    } else if (data.battery_level > 0.99 && data.charging) {
      if (this.chargingBots.has(data.vehicle_id)) {
        this.chargingBots.delete(data.vehicle_id);
      }
      this.vehicleParking(data.vehicle_id, data.current_station);
    }
  }

  vehicleParking(vehicle_id, current_station) {
    if (this.parkingBots.has(vehicle_id)) {
      return;
    }
    this.parkingBots.set(vehicle_id, false);
    this.msgCB({ vehicle_id: vehicle_id, msg: 'park', current_station: current_station });
  }


  pollVehicles() {
    this.socketHelper.findBot();
    setTimeout(() => { this.pollVehicles(); }, 5000);
  }

  addVehicle(vehicle_data) {
    if (this.botMap.get(vehicle_data.port)) {
      return; // 已连接，直接返回
    }
    let vehicleIndex = -1;
    for (let i = 0; i < this.botList.length; i++) {
      if (this.botList[i].getId() == vehicle_data.id) {
        vehicleIndex = i;
        //this.botList[i].status = 'online';
        this.botList[i].setStatus(vehicle_data);
        this.botList[i].setNetStatus('online');
        break;
      }
    }
    if (vehicleIndex == -1) {
      this.bot_db.insert(vehicle_data);
      let bot = new Vehicle(vehicle_data.id, this.socketHelper);
      bot.setStatus(vehicle_data);
      bot.setNetStatus('online');
      this.botList.push(bot);
      vehicleIndex = this.botList.length - 1;
    }
    //this.botMap.set(vehicle_data.current_ip, this.botList[vehicleIndex]);
    this.botList[vehicleIndex].connect();
    //console.log(this.botMap);
  }

  getVehicle(vehicle_id) {
    for (let i = 0; i < this.botList.length; i++) {
      if (this.botList[i].getVehicle_id() == vehicle_id) {
        return this.botList[i];
      }
    }
    return null;
  }

  getVehicles() {
    let Vehicles = [];
    for (let i = 0; i < this.botList.length; i++) {
      Vehicles[i] = this.botList[i].status;
    }
    return Vehicles;
  }

  getDispatchVehicle(vehicle_id, order) {
    logger.info('Check there are any vehicles that could process a transport order...');
    let dispatch_bot = null;
    switch (order.category) {
      case 'Charge':
        if (vehicle_id && this.chargingBots.get(vehicle_id) == false) { // not in charge order
          let vehicle = this.getVehicle(vehicle_id);
          if (vehicle.getTask_status() == 0 && vehicle.getNetStatus() == 'connected') {
            this.chargingBots.set(vehicle_id, true); // set it in charge order
            dispatch_bot = vehicle;
          }
        }
        break;
      case 'Park':
        if (vehicle_id) {
          if (!this.parkingBots.has(vehicle_id)) {
            this.parkingBots.set(vehicle_id, false);
          }
          if(this.parkingBots.get(vehicle_id) == false) {
            let vehicle = this.getVehicle(vehicle_id);
            if (vehicle.getTask_status() == 0 && vehicle.getNetStatus() == 'connected') {
              this.parkingBots.set(vehicle_id, true); // set it in charge order
              dispatch_bot = vehicle;
            }
          }
        }
        break;
      default:
        if (vehicle_id) {
          let vehicle = this.getVehicle(vehicle_id);
          if (vehicle.getTask_status() == 0 && vehicle.getNetStatus() == 'connected') {
            dispatch_bot = vehicle;
          }
        } else {
          dispatch_bot = this.getIdleBot(order);
          //dispatch_bot = this.getTestBot();
        }
        break;
    }
    return dispatch_bot;
  }

  getIdleBot(order) {
    logger.info('Check there are any idle vehicles that could process the transport order...');
    let select_bot = null;
    let min_distance = Number.MAX_SAFE_INTEGER;
    this.botList.forEach((bot) => {
      let status = bot.getStatus();
      if (status.status == 'connected' && status.task_status == 0 && status.battery_level > 0.1 && status.charging == false) {
        let distance = this.MapService.pathDistance(bot.getCurrent_station(), order.destinations[0].locationName, bot.getPosition());
        if (distance < min_distance) {
          select_bot = bot;
          min_distance = distance;
        }
      }
    });
    logger.info('The idle vehicle that could process the transport order is ' + select_bot);
    if (select_bot) {
      let vehicle_id = select_bot.getVehicle_id();
      if (this.parkingBots.has(vehicle_id)) {
        this.parkingBots.delete(vehicle_id);
      }
      return select_bot;
    }

    min_distance = Number.MAX_SAFE_INTEGER;
    this.parkingBots.forEach((value, key) => {
      let vehicle = this.getVehicle(key);
      let status = vehicle.getStatus();
      if (status.status == 'connected' && status.task_status == 2) { // going to ParkPoint
        let distance = this.MapService.pathDistance(vehicle.getCurrent_station(), order.destinations[0].locationName, vehicle.getPosition());
        if (distance < min_distance) {
          select_bot = vehicle;
          min_distance = distance;
        }
      }
    });
    logger.info('The vehicle that could process the transport order is ' + select_bot);
    if (select_bot) {
      let vehicle_id = select_bot.getVehicle_id();
      if (this.parkingBots.has(vehicle_id)) {
        this.parkingBots.delete(vehicle_id);
      }
      return select_bot;
    }

    return select_bot;
  }
  
  // API for Vehicles --------------------------------------------------------
  integrationLevel(vehicle_id, newValue) {
    return new Promise((resolve, reject) => {
      if (newValue == 'TO_BE_IGNORED' || newValue == 'TO_BE_NOTICED' || newValue == 'TO_BE_RESPECTED' || newValue == 'TO_BE_UTILIZED') {
        let vehicle = this.VehiclesService.getVehicle(vehicle_id);
        if (vehicle != null) {
          vehicle.getStatus().integrationLevel = newValue;
          resolve(200);
        } else {
          reject({code: 404 , msg: "Unknown vehicle " + vehicle_id});
        }
      }
      else {
        reject({code: 400, msg: "Parameter 'newValue' is illegal."});
      }
    })
  }

  integrationLevelAll(newValue) {
    return new Promise((resolve, reject) => {
      if (newValue == 'TO_BE_IGNORED' || newValue == 'TO_BE_NOTICED' || newValue == 'TO_BE_RESPECTED' || newValue == 'TO_BE_UTILIZED') {
        for (let i = 0; i < this.botList.length; i++) {
          let vehicle = this.botList[i];
          vehicle.getStatus().integrationLevel = newValue;
        }
        resolve(200);
      } else {
        reject({code: 400, msg: "Parameter 'newValue' is illegal."});
      }
    })
  }

  pause(vehicle_id, newValue) {
    return new Promise((resolve, reject) => {
      let vehicle = this.getVehicle(vehicle_id);
      if(vehicle) {
        if(newValue == 'true') {
          console.log("set "+vehicle_id + " pause");
          if(vehicle.getNetStatus() == 'connected') {
            vehicle.pauseTask();
          }
          resolve(200);
        } else if (newValue == 'false') {
          console.log("set "+vehicle_id + " resume");
          if(vehicle.getNetStatus() == 'connected') {
            vehicle.resumeTask();
          }
          resolve(200);
        } else {
          reject({code: 400, msg: "Parameter 'newValue' is illegal."});
        }
      } else {
        reject({code: 404 , msg: "Unknown vehicle " + vehicle_id});
      }
    });
  }

  pauseAll(newValue) {
    return new Promise((resolve, reject) => {
      if(newValue == 'true') {
        this.botList.forEach((vehicle)=>{
          if(vehicle.getNetStatus() == 'connected') {
            vehicle.pauseTask();
          }
        });
        resolve(200);
      } else if(newValue == 'false') {
        this.botList.forEach((vehicle)=>{
          if(vehicle.getNetStatus() == 'connected') {
            vehicle.resumeTask();
          }
        });
        resolve(200);
      } else {
        reject({code: 400, msg: "Parameter 'newValue' is illegal."});
      }
    });
  }

}

module.exports = VehiclesService;