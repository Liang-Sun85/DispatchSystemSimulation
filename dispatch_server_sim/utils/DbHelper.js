class DbHelper {
  constructor(database) {
    this.Datastore = require("nedb");

    let options = {
      filename: database,
      autoload: true,
    };
    this.db = new this.Datastore(options);
    console.log("database:" + database);
  }

  limit(limitSize) {
    this.limitSize = limitSize;
    return this;
  }
  skip(offset) {
    this.offset = offset;
    return this;
  }

  sort(orderby) {
    this.orderby = orderby;
    return this;
  }

  count(query) {
    return new Promise((resolve, reject) => {
      let stmt = this.db.count(query || {});
      stmt.exec((err, count) => {
        if (err) {
          return reject(err);
        }
        resolve(count);
      })
    })
  }

  find(query, select) {
    return new Promise((resolve, reject) => {
      let stmt = this.db.find(query || {});
      if (this.orderby !== undefined) {
        stmt.sort(this.orderby);
      }
      if (this.offset !== undefined) {
        stmt.skip(this.offset);
      }
      if (this.limitSize !== undefined) {
        stmt.limit(this.limitSize);
      }
      if (select != undefined) {
        stmt.projection(select || {});
      }
      stmt.exec((err, docs) => {
        if (err) {
          return reject(err);
        }
        resolve(docs);
      })
    })
  }

  findOne(query, select) {
    return new Promise((resolve, reject) => {
      let stmt = this.db.findOne(query || {});
      if (this.sort !== undefined) {
        stmt.sort(this.sort);
      }
      if (select != undefined) {
        stmt.projection(select || {});
      }
      stmt.exec((err, doc) => {
        if (err) {
          return reject(err);
        }
        resolve(doc);
      })
    })
  }

  insert(values) {
    return new Promise((resolve, reject) => {
      this.db.insert(values, (err, newDoc) => {
        if (err) {
          return reject(err);
        }
        resolve(newDoc);
      })
    })
  }

  update(query, values, options) {
    return new Promise((resolve, reject) => {
      this.db.update(query || {}, values || {}, options || {}, (err, numAffected) => {
        if (err) {
          return reject(err);
        }
        resolve(numAffected);
      })
    });
  }

  remove(query, options) {
    return new Promise((resolve, reject) => {
      this.db.remove(query || {}, options || {}, (err, numAffected) => {
        if (err) {
          return reject(err);
        }
        resolve(numAffected);
      })
    });
  }
}

//export default DbHelper;
module.exports = DbHelper;