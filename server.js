#!/usr/bin/env node

var debug = require('debug')('server');
var chrono = require('./lib/chrono').createServer();


debug('startup.');

var jimmy = function (data) {
    console.log('got laptime data:');
    console.log(data);
}

chrono
    .setup(jimmy)
    .start(function(err) {
        if (err) {
            debug('failed to start listener.');    
        } else {
            debug('up and running.');
        }
    });


