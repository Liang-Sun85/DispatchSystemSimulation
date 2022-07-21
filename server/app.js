'use strict'
//var createError = require('http-errors');
const express = require('express');
const path = require('path');
//const cookieParser = require('cookie-parser');
var history = require('connect-history-api-fallback');
const morgan = require('morgan');
const { httpLogger } = require('./utils/MyLogger');

const routes = require('./routes/routes') // 初始化路由
const Service = require('./service/Service') // 初始化Service

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http,{
  cors: {
      origin: '*'
  }
});

Service.start(io);

initApp(app);    // 初始化express设置  

//setTimeout(() => { Service.start(); }, 2000); // Service start

function initApp(app) {
  //app.use(morgan('dev')); // 设置日志
  app.use(morgan('combined', { // 'combined' or 'dev'
    stream: {
      write: (message) => httpLogger.info(message)
    }
  }));

  app.use(express.json()); // enable json
  app.use(express.urlencoded({ extended: false })); // post data解析
  //app.use(cookieParser()); // cookie处理
  routes(app); // 设置API路由
  app.use(history({
    htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
  })); // 适配VUE Router
  app.use(express.static(path.join(__dirname, 'dist'))); // 映射静态网页文件

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    console.log('catch 404');
    res.send('404,您访问的路由不存在！', 404);
  });

  // error handler
  app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    console.log(err);
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

  //app.listen(30001); // 设置端口
  http.listen(30001);
  console.log('express server started on: ' + 30001);
}