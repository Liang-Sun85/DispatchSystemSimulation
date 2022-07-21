var express = require('express');
var router = express.Router();
const Service = require('../service/Service')

router.get('/', function(req, res) {
  let procState = req.query.procState;
  res.json(Service.VehiclesService.getVehicles(procState));
});

router.get('/:name', function(req, res) {
  res.json(Service.VehiclesService.getVehicle(req.params.name));
});

router.post('/:name/withdrawal', function(req, res) {
  Service.withdrawalTransportOrder(req.params.name, req.query.immediate, req.query.disableVehicle).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.put('/:name/integrationLevel', function(req, res) {
  VehiclesService.integrationLevel(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.put('/integrationLevel', function(req, res) {
  VehiclesService.integrationLevelAll(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.put('/:name/processableCategories', function(req, res) {
  VehiclesService.processableCategories(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.put('/:name/energyLevelGood', function(req, res) {
  VehiclesService.energyLevelGood(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.put('/:name/energyLevelCritical', function(req, res) {
  VehiclesService.energyLevelCritical(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.put('/:name/energyLevelSufficientlyRecharged', function(req, res) {
  VehiclesService.energyLevelSufficientlyRecharged(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.put('/:name/energyLevelFullyRecharged', function(req, res) {
  VehiclesService.energyLevelFullyRecharged(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.post('/:name/pause', function(req, res) {
  Service.VehiclesService.pause(req.params.name, req.query.newValue).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

router.post('/pause', function(req, res) {
  Service.VehiclesService.pauseAll(req.query.newValue).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

module.exports = router;