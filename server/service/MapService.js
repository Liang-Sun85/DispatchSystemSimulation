'use strict'
const DbHelper = require('../utils/DbHelper');
var fs = require('fs');
const {logger} = require('../utils/MyLogger');

class MapService {
  constructor() {
    try {
      fs.accessSync('./data/');
    } catch (e) {
      fs.mkdirSync('./data/');
    }
    try {
      fs.accessSync('./data/maps/');
    } catch (e) {
      fs.mkdirSync('./data/maps/');
    }
    this.map_settings = {};
    this.smap = null;
    this.bLoadMap = false;

    this.parkPointStatus = new Map();
    this.chargePointStatus = new Map();

    this.settings_db = new DbHelper('./data/settings'); //初始化数据库
    this.map_db = new DbHelper('./data/map');
  }

  start() {
    return new Promise((resolve, reject) => {
      this.settings_db.findOne({ category: 'map' }, { _id: 0 }).then((doc) => {
        if (doc) {
          this.map_settings = doc;
        } else {
          this.map_settings = { category: 'map', current_map: 'test.smap' };
          this.settings_db.insert(this.map_settings);
        }
        this.loadMap(this.map_settings.current_map).then((map) => {
          this.setSmap(map);
          resolve();
        }).catch((err) => {
          reject(err);
        });
      }).catch((err) => {
        reject(err);
      });
    });
  }

  hasMap() {
    return this.bLoadMap;
  }

  getCurrentMap() {
    return this.smap;
  }

  getCurrentMapFilename() {
    return this.map_settings.current_map;
  }

  getMapList() {
    return new Promise((resolve, reject) => {
      this.map_db.sort({ create_time: -1 }).find({}).then((doc) => {
        resolve(doc);
      }).catch((err) => {
        reject({ code: 400, msg: err });
      });
    });
  }

  getMap(filename) {
    return new Promise((resolve, reject) => {

    });
  }

  addMap(note, file/*, user*/) {
    return new Promise((resolve, reject) => {
      let now = new Date();
      let now_format = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
      console.log(file);
      let map_item = { note: note, path: file.path, filename: file.filename, originalname: file.originalname, create_time: now_format, owner: /*user*/ 'admin' };
      console.log(map_item);
      this.map_db.insert(map_item).then(() => {
        resolve(200);
      }).catch((err) => {
        reject({ code: 400, msg: err });
      });
    });
  }

  updateCurrentMap(filename) {
    return new Promise((resolve, reject) => {
      this.settings_db.update({ category: 'map' }, { $set: { current_map: filename } }).then((numAffected) => {
        this.map_settings.current_map = filename;
        this.loadMap(this.map_settings.current_map).then((map) => {
          this.setSmap(map);
          resolve(200);
        }).catch((err) => {
          reject({ code: 400, msg: err });
        });
      }).catch((err) => {
        reject({ code: 400, msg: err });
      });
    });
  }

  setSmap(map) {
    this.smap = map;
    this.bLoadMap = true;
    this.vexSet = this.getVexSet();
    this.arcSet = this.getArcSet();
    this.parkPointStatus.clear();
    this.chargePointStatus.clear();
    this.smap.advancedPointList.forEach((station)=>{
      if(station.className == 'ParkPoint') {
        this.parkPointStatus.set(station.instanceName, false);
      } else if(station.className == 'ChargePoint') {
        this.chargePointStatus.set(station.instanceName, false);
      }
    });
    logger.info('Initializing smap...');
    console.log(this.parkPointStatus);
    console.log(this.chargePointStatus);
  }

  getStationType(stationName) {
    for (let i = 0; i < this.smap.advancedPointList.length; i++) {
      if (this.smap.advancedPointList[i].instanceName == stationName) {
        return this.smap.advancedPointList[i].className;
      }
    }
  }

  getPath(source, destination, position) {
    if (position != null && (source == 'null' || source == '')) {
      let source = this.findNearestSation(position);
      let path = this.findPath(source, destination);
      //path.unshift('SELF_POSITION');
      return path;
    } else {
      return this.findPath(source, destination);
    }
  }

  findPath(source, destination) {
    const INF = Number.MAX_SAFE_INTEGER;
    let k;
    let min;
    let final = [];
    let pathMatrix = []; // each node's precursor node
    let shortPathTable = []; // the minimun distance from the source node
    let sourceIndex = this.vexSet.indexOf(source);
    let destinationIndex = this.vexSet.indexOf(destination);

    for (let v = 0; v < this.vexSet.length; v++) {
      final[v] = 0;
      shortPathTable[v] = this.arcSet[sourceIndex][v];
      pathMatrix[v] = INF;
    };
    final[sourceIndex] = 1;

    while (final[destinationIndex] != 1) {
      min = INF;
      for (let w = 0; w < this.vexSet.length; w++) {
        if (!final[w] && shortPathTable[w] < min) {
          k = w;
          min = shortPathTable[w];
        };
      };
      final[k] = 1;
      for (let w = 0; w < this.vexSet.length; w++) {
        if (!final[w] && (min + this.arcSet[k][w] < shortPathTable[w])) {
          shortPathTable[w] = min + this.arcSet[k][w];
          pathMatrix[w] = k;
        };
      };
    };

    let temp = destinationIndex;
    let path = [];
    let path_idx = 0;
    while (temp != INF) {
      path[path_idx] = this.vexSet[temp];
      temp = pathMatrix[temp];
      path_idx++;
    };
    path.reverse();
    path.unshift(this.vexSet[sourceIndex]);
    return path;
  }

  findNearestSation(position) {
    let min = Number.MAX_SAFE_INTEGER;
    let station = '';
    for (let i = 0; i < this.smap.advancedPointList.length; i++) {
      let transX = Math.pow(position.x - this.smap.advancedPointList[i].pos.x, 2);
      let transY = Math.pow(position.y - this.smap.advancedPointList[i].pos.y, 2);
      let distance = Math.sqrt(transX + transY);
      if (distance < min) {
        min = distance;
        station = this.smap.advancedPointList[i].instanceName;
      }
    }
    return station;
  }

  getNearestStation(current_station, type, position) {
    let min = Number.MAX_SAFE_INTEGER;
    let station = null;
    for (let i = 0; i < this.smap.advancedPointList.length; i++) {
      if (this.smap.advancedPointList[i].className == type) {
        let station_name = this.smap.advancedPointList[i].instanceName;
        logger.info(station_name+ " is " + this.parkPointStatus.get(station_name));
        if ((type == 'ParkPoint' && this.parkPointStatus.get(station_name)) || (type == 'ChargePoint' && this.chargePointStatus.get(station_name))) {
          continue;
        }
        let distance = this.pathDistance(current_station, station_name, position);
        if (distance < min) {
          min = distance;
          station = station_name;
        }
      }
    }
    /*if (station) {
      if (type == 'ParkPoint') {
        this.parkPointStatus.set(station, true);
      } else if (type == 'ChargePoint') {
        this.chargePointStatus.set(station, true);
      }
    }*/
    return station;
  }

  requestParkPoint(station) {
    logger.info('requestParkPoint ' + station);
    this.parkPointStatus.set(station, true);
  }

  requestChargePoint(station) {
    logger.info('requestChargePoint ' + station);
    this.chargePointStatus.set(station, true);
  }

  releaseParkPoint(station) {
    logger.info('releaseParkPoint ' + station);
    this.parkPointStatus.set(station, false);
  }

  releaseChargePoint(station) {
    logger.info('releaseChargePoint ' + station);
    this.chargePointStatus.set(station, false);
  }

  isStationInMap(stationName) {
    return this.vexSet.includes(stationName);
  }

  loadMap(name) {
    return new Promise((resolve, reject) => {
      let path = './data/maps/' + name;
      fs.readFile(path, "utf8", (err, data) => {
        if (!err) {
          let map = JSON.parse(data);
          delete map.normalPosList;
          resolve(map);
        } else {
          reject(err);
        }
      });
    });
  }

  getVexSet() {
    let array = [];
    for (let i = 0; i < this.smap.advancedPointList.length; i++) {
      array[i] = this.smap.advancedPointList[i].instanceName;
    }
    return array;
  }

  getArcSet() {
    let array = [];
    let arc = this.smap.advancedCurveList;
    for (let i = 0; i < this.vexSet.length; i++) {
      array[i] = [];
      for (let j = 0; j < this.vexSet.length; j++) {
        if (i == j) {
          array[i][j] = 0;
        } else {
          array[i][j] = Number.MAX_SAFE_INTEGER;
        }
        for (let k = 0; k < arc.length; k++) {
          if (this.vexSet[i] == arc[k].startPos.instanceName && this.vexSet[j] == arc[k].endPos.instanceName) {
            let transX = Math.pow(arc[k].startPos.pos.x - arc[k].endPos.pos.x, 2);
            let transY = Math.pow(arc[k].startPos.pos.y - arc[k].endPos.pos.y, 2);
            array[i][j] = Math.sqrt(transX + transY);
            break;
          }
        }
      }
    }
    return array;
  }

  pathDistance(source, destination, position) {
    if (source == 'null' || source == '') {
      source = this.findNearestSation(position);
    }
    return this.pathDistance2(source, destination);
  }

  pathDistance2(source, destination) {
    const INF = Number.MAX_SAFE_INTEGER;
    let k;
    let min;
    let final = [];
    let pathMatrix = []; // each node's precursor node
    let shortPathTable = []; // the minimun distance from the source node
    let sourceIndex = this.vexSet.indexOf(source);
    let destinationIndex = this.vexSet.indexOf(destination);

    for (let v = 0; v < this.vexSet.length; v++) {
      final[v] = 0;
      shortPathTable[v] = this.arcSet[sourceIndex][v];
      pathMatrix[v] = INF;
    };
    final[sourceIndex] = 1;

    while (final[destinationIndex] != 1) {
      min = INF;
      for (let w = 0; w < this.vexSet.length; w++) {
        if (!final[w] && shortPathTable[w] < min) {
          k = w;
          min = shortPathTable[w];
        };
      };
      final[k] = 1;
      for (let w = 0; w < this.vexSet.length; w++) {
        if (!final[w] && (min + this.arcSet[k][w] < shortPathTable[w])) {
          shortPathTable[w] = min + this.arcSet[k][w];
          pathMatrix[w] = k;
        };
      };
    };
    return shortPathTable[destinationIndex];
  }

  hasEmptyChargePoint(){
    for (let [key, value] of this.chargePointStatus) {
      if(value == false) {
        return true;
      }
    }
    return false;
  }

}

module.exports = new MapService();