'use strict'
const DbHelper = require('../utils/DbHelper');

class UserService {
  constructor() {
    this.users_db = new DbHelper('./data/users'); //初始化数据库
    this.users_db.find({ user: 'admin' }, { _id: 0 }).then((doc) => {
      if (doc.length == 0) {
        this.users_db.insert({ user: 'admin', password: 'changhong' });
      }
    });
  }

  findUser(user, password) {
    return new Promise((resolve, reject) => {
      this.users_db.findOne({ user: user, password: password }).then((doc) => {
        console.log(doc);
        if (doc) {
          resolve();
        } else {
          reject();
        }
      }).catch((err) => {
        console.log(err);
        reject();
      })
    });
  }

  newUser(user, password) {
    return new Promise((resolve, reject) => {
      this.users_db.findOne({ user: user }).then((doc) => {
        if (doc) {
          let msg = {ret_code:1, msg: '用户已存在'};
          reject(msg);
          return;
        } 
      });

      this.users_db.insert({ user: user, password: password }).then(() => {
        resolve();
      }).catch((err) => {
        let msg = {ret_code:1, msg: '数据库错误'};
        reject(msg);
      })
    });
  }

}

module.exports = new UserService();