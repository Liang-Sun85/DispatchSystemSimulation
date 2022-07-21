var express = require('express');
const os = require('os');
var router = express.Router();

router.get('/wshost', function (req, res) {
  res.send("ws://localhost:30001");
});

function getIpAddress() {
  var interfaces = os.networkInterfaces()

  for (var dev in interfaces) {
    let iface = interfaces[dev]

    for (let i = 0; i < iface.length; i++) {
      let { family, address, internal } = iface[i]

      if (family === 'IPv4' && address !== '127.0.0.1' && !internal) {
        return address
      }
    }
  }
}

module.exports = router;
