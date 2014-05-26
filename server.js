#!/usr/bin/env node

var chrono = require('./lib/chrono').createServer();
var datagram = require('dgram');
var socket = datagram.createSocket('udp4');
var osc = require('osc-min');

var targetAddress = '192.168.142.145';
var targetPort = 3333;

console.log('startup.');

var sendOSC = function(data) {
    var buf = osc.toBuffer({
        address: '/id',
        args: [ {
            type: 'integer',
            value: (0+data)
        } ]
    });
    socket.send(buf, 0, buf.length, targetAddress, targetPort);
}

var jimmy = function (data) {
    console.log('got laptime data:', JSON.stringify(data));
    //console.log(data);
    if ((data['tag']) && ((data['tag'])>0)) {
        sendOSC(data['tag']);
    }
};

chrono
    .setup(jimmy)
    .start(function(err) {
        if (err) {
            console.log('failed to start listener.');
        }
    });


