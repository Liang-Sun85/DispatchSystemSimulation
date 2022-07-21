var express = require('express');
var router = express.Router();
const Service = require('../service/Service');
const OrderService = require('../service/OrderService');


router.get('/', function (req, res) {
  OrderService.getOrders(req.query.intendedVehicle, req.query.processingVehicle, req.query.category, req.query.state, req.query.pageNo, req.query.pageSize, req.query.regexp)
    .then((doc) => {
      res.json(doc);
    }).catch((err) => {
      res.status(400).send(err);
    });
});

router.post('/:name', function (req, res) {
  Service.newOrder(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.post('/:name/withdrawal', function (req, res) {
  Service.withdrawOrder(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.put('/:name/deadline', function (req, res) {
  OrderService.orderDeadlineUpdate(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.get('/test', function (req, res) {
  let current_station = req.query.station;
  console.log(current_station);
  Service.newParkingOrder('001', current_station);
  res.sendStatus(200);
});

router.delete('/', function (req, res) {
  OrderService.deleteAll().then(() => {
    res.sendStatus(200);
  }).catch((err) => {
    res.status(400).send(err);
  });
});

module.exports = router;
