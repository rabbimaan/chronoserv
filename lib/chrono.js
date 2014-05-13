var net = require('net');
var debug = require('debug')('chrono');

module.exports.createServer = createServer;

function createServer() {
    return new chronoserver();
}

function chronoserver() {
    var interface = '';
    var port = 61611;;
}

chronoserver.prototype.setup = function (interface, port, cb) {
    debug('setting up listener.');
    if (cb) cb();
}
chronoserver.prototype.start = function (cb) {
    debug('starting listener.');
    if (cb) cb();
}
