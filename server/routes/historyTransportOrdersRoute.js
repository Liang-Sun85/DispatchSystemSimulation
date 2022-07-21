var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  res.json({ todo: 'history orders list' });
});

/*router.post('/login',function (req,res){
  console.log(req.body);
  console.log(req.body.name);
  res.send({
      msg: 'set演示'
  })
});*/

module.exports = router;
