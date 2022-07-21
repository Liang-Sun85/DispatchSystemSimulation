var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  res.json({todo: 'orderSequences list'});
});

router.get('/:name', function(req, res) {
  OrderService.getOrderSequence(req.params.name, req.body).then((code) => {
    res.sendStatus(code);
  }).catch((err) => {
    res.status(err.code).send(err.msg);
  });
});

/*router.post('/login',function (req,res){
  console.log(req.body);
  console.log(req.body.name);
  res.send({
      msg: 'set演示'
  })
});*/

module.exports = router;
