'use strict';
const winston = require('winston');
const dailyRoateFile = require('winston-daily-rotate-file');

const httpFileTransport = new dailyRoateFile({
    filename: './logs/HTTP_' +'%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    prepend: true,
    maxDays: 30
});
const fileTransport = new dailyRoateFile({
    filename: './logs/' +'%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    prepend: true,
    maxDays: 30
});
const consoleTransport = new winston.transports.Console();


const httpFormat = winston.format.printf((info) => {
    return `${info.message}`
});
const normalFormat = winston.format.printf((info) => {
    return `[${info.level}] [${info.timestamp}] : ${info.message}`
});

winston.loggers.add('http', {format: httpFormat, transports: [consoleTransport, httpFileTransport]});
winston.loggers.add('normal', {
    format: winston.format.combine(
        winston.format.timestamp(),
        normalFormat
    ),
    transports: [consoleTransport, fileTransport],
    exitOnError: false
});

const httpLogger = winston.loggers.get('http')
const logger = winston.loggers.get('normal');

module.exports = {
    httpLogger,
    logger
};