var express = require('express');
var router = express.Router();
const userService = require('../service/userService');

router.post('/login', function(req, res) {
  userService.findUser(req.body.user, req.body.password)
  .then(()=>{
    req.session.loginUser = req.body.user;
    res.json({ret_code: 0, msg: '登录成功'});
  })
  .catch(()=>{
    res.json({ret_code: 1, msg: '账号或密码错误'});
  });
});

router.get('/logout', function(req, res, next){
  req.session.destroy(function(err) {
      if(err){
          res.json({ret_code: 2, ret_msg: '退出登录失败'});
          return;
      }
      res.redirect('/loginPage');
  });
});

router.post('/:user', function (req, res) {
  if(req.session.loginUser != 'admin') {
    res.status(401).json({ret_code:1, msg: '无权限！'});
    return;
  }

  userService.newUser(req.params.user, req.body.password).then(() => {
    res.sendStatus(200);
  }).catch((err) => {
    res.status(400).json(err);
  });
});


module.exports = router;
