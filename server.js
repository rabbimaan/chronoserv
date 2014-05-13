#!/usr/bin/env node

var debug = require('debug')('server');
var chrono = require('./lib/chrono').createServer();


debug('startup.');

chrono.setup();
chrono.start(function(err) {
    if (err) {
        debug('failed to start listener.');    
    } else {
        debug('up and running.');
    }
});

