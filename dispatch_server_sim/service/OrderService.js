'use strict'
const DbHelper = require('../utils/DbHelper');
const {logger} = require('../utils/MyLogger');
var self;

class OrderService {
  constructor() {
    self = this;
    this.dispatchableOrders = [];
    this.order_db = new DbHelper('./data/order'); //初始化数据库
    this.order_db.find({ 'state': 'DISPATCHABLE' }, { _id: 0 }).then((doc) => {
      console.log(doc);
      this.dispatchableOrders = doc;
    });
  }

  newOrder(name, state, order) {
    return new Promise((resolve, reject) => {
      this.order_db.findOne({ 'name': name }).then((doc) => {
        if (doc) {
          reject({ code: 409, msg: "Transport order '" + name + "' already exists." });
        } else {
          Object.assign(order, { name: name, state: state, creationTime: Date.now() });
          this.order_db.insert(order);
          if (state == 'DISPATCHABLE') {
            logger.info('Creates a new transport order to dispatchable.');
            this.dispatchableOrders.push(order);
            console.log(this.dispatchableOrders);
            resolve(200);
          } else {
            reject({ code: 404, msg: "Transport order is not valid" });
          }
        }
      });
    });
  }

  withdrawOrder(ordername) {
    return new Promise((resolve, reject) => {
      this.order_db.findOne({ 'name': ordername}).then((doc) => {
        if (doc) {
          if(doc.state == 'DISPATCHABLE' || doc.state == 'BEING_PROCESSED') {
            this.updateState(ordername, 'WITHDRAWN');
          }
          resolve(200);
        } else {
          reject({code: 404 , msg: "Unknown transport order " + ordername});
        }
      })
    })
  }

  orderDeadlineUpdate(orderName, newValue) {
    return new Promise((resolve, reject) => {
      if (newValue = null) {
        reject({code: 400, msg: "New value should not be null."});
      }
      this.order_db.findOne({ 'name': orderName}).then((doc) => {
        if (doc) {
          this.updateDeadline(orderName, newValue);
          resolve(200);
        } else {
          reject({code: 404 , msg: "Unknown transport order " + orderName});
        }
      })
    })
  }

  getOrder(orderName) {
    return new Promise((resolve, reject) => {
      this.order_db.findOne({name:orderName}, { _id: 0 }).then((order)=>{
        resolve(order);
      });
    });
  }

  getOrders(intendedVehicle, processingVehicle, category, state, pageNo, pageSize, regexp) {
    return new Promise((resolve, reject) => {
      let query = {};
      if (intendedVehicle) {
        query.intendedVehicle = intendedVehicle;
      }
      if (processingVehicle) {
        query.processingVehicle = processingVehicle;
      }
      if (category) {
        query.category = category;
      }
      if (state) {
        query.state = state;
      }
      this.order_db.count(query)
        .then((count)=>{
          console.log(pageNo);
          console.log(pageSize);
          this.order_db.skip((pageNo - 1) * pageSize).limit(pageSize).sort({ creationTime: -1 }).find(query, { _id: 0 }).then((doc) => {
            let totalPage = Math.ceil(count/pageSize);
            let data = {total:totalPage, page:doc}
            resolve(data);
          }).catch((err) => {
            reject(err);
          });
        });

    });
  }

  deleteAll() {
    return new Promise((resolve, reject) => {
      this.order_db.remove({},{multi: true}).then((numAffected)=>{
        console.log('remove ok '+numAffected);
        this.dispatchableOrders.length = 0;
        resolve();
      }).catch(err=>{
        console.log(err);
        reject(err);
      })
    });
  }

  getDispatchableOrders() {
    //logger.info('Check the transport order to dispatchable: ' + this.dispatchableOrders);
    logger.info('Check the transport order to dispatchable...');
    return this.dispatchableOrders;
  }

  updateState(name, state) {
    for (let i = 0; i < this.dispatchableOrders.length; i++) {
      if (this.dispatchableOrders[i].name == name && state != 'DISPATCHABLE') {
        this.dispatchableOrders.splice(i, 1);
      }
    }
    if(state == 'FINISHED') {
      this.order_db.update({ name: name }, { $set: { state: state , finishedTime: Date.now()} });
    } else {
      this.order_db.update({ name: name }, { $set: { state: state } });
    }
  }

  updateDeadline(name, newValue) {
    this.order_db.update({ name: name }, { $set: { deadline: newValue } });
  }

  update(name, param, value) {
    let obj = {};
    obj[param] = value;
    this.order_db.update({ name: name }, { $set: obj });
  }

  getOrderSequence(orderSequenceName) {
    return new Promise((resolve, reject) => {
      this.order_db.findOne({ 'name': orderName}).then((doc) => {
        if (doc) {
          resolve(200);
        } else {
          reject({code: 404 , msg: "Unknown order sequence" + orderSequenceName});
        }
      })
    })
  }
}

module.exports = new OrderService();