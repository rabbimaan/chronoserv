#!/usr/bin/env node

var chrono = require('./lib/chrono').createServer();


console.log('startup.');

var jimmy = function (data) {
    console.log('got laptime data:');
    console.log(data);
};

chrono
    .setup(jimmy)
    .start(function(err) {
        if (err) {
            console.log('failed to start listener.');
        }
    });


