const transportOrdersRoute = require('./transportOrdersRoute');
const historyTransportOrdersRoute = require('./historyTransportOrdersRoute');
const orderSequencesRoute = require('./orderSequencesRoute');
const vehiclesRoute = require('./vehiclesRoute');
const vehicleDetailsRoute = require('./vehicleDetailsRoute');
const pathsRoute = require('./pathsRoute');
const mapsRoute = require('./mapsRoute');
const userRoute = require('./userRoute');
const utilsRoute = require('./utilsRoute');

var session = require('express-session');

module.exports = function (app) {
  app.use('/api/route/transportOrders', transportOrdersRoute);
  app.use('/api/route/historyTransportOrders', historyTransportOrdersRoute);
  app.use('/api/route/orderSequences', orderSequencesRoute);

  app.use('/api/route/vehicles', vehiclesRoute);
  app.use('/api/route/vehicleDetails', vehicleDetailsRoute);

  app.use('/api/route/paths', pathsRoute);

  app.use('/api/route/maps', mapsRoute);

  app.use('/api/route/utils', utilsRoute);

  app.use(session({
    name: 'skey',
    secret: 'changhong',  // 用来对session id相关的cookie进行签名
    cookie: {
      maxAge: 60 * 1000  // 有效期，单位是毫秒
    }
  }));

  app.use('/api/route/users', userRoute);

  app.use((req, res, next) => { // check login status
    let url = req.originalUrl;
    if(url.indexOf('/js/') == 0 || url.indexOf('/css/') == 0 || url.indexOf('/fonts/') == 0) {
      next();
    } else {
      if(req.session.loginUser) {
        next();
      } else {
        if(url == '/loginPage') {
          next();
        } else {
          res.redirect('/loginPage');
        }
      }
    }    
  });
}