var express = require('express');
var router = express.Router();
var multer = require('multer');
const Service = require('../service/Service');
const MapService = require('../service/MapService');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './data/maps');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
var upload = multer({ storage: storage })

// get map list
router.get('/', function (req, res) {
  MapService.getMapList().then((maps)=>{
    res.send(maps);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

// upload map
router.post('/:note', upload.single('map'), function (req, res) {
  MapService.addMap(req.params.note, req.file/*, req.session.loginUser*/).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

// get current map content
router.get('/current', function (req, res) {
  res.send(MapService.getCurrentMap());
});

// get current map filename
router.get('/current/filename', function (req, res) {
  res.send(MapService.getCurrentMapFilename());
});

// get current driveorder
router.get('/currentDriveOrder', function (req, res) {
  res.send(Service.runningDriveOrder());
});

// get map content
router.get('/:filename', function (req, res) {
  MapService.loadMap(req.params.filename).then((map) => {
    res.send(map);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

// update current map
router.put('/current', function (req, res) {
  console.log(req.body.filename);
  MapService.updateCurrentMap(req.body.filename).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

module.exports = router;
