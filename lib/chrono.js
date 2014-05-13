var net = require('net');
var debug = require('debug')('chrono');
var _ = require('underscore');

module.exports.createServer = createServer;

function createServer() {
    return new chronoserver();
}

function chronoserver() {
    this.interface = '';
    this.port = 61611;;
    this.server = net.createServer(this.connectListener);
}

chronoserver.prototype.setup = function (interface, port, cb) {
    if (!(!_.isUndefined(interface) && _.isString(interface) && ((net.isIP(interface) > 0) || (interface == '')))) {
        if (_.isFunction(interface)) {
            //debug('forwarding interface parameter to callback');
            return this.setup(this.interface, this.port, interface);
        }
        else {
            //debug('forwarding interface to port and port to callback.');
            return this.setup(this.interface, interface, port);
        }
    } else {
        if (!(!_.isUndefined(port) && _.isNumber(port) && (port > 0))) {
            if (_.isFunction(port)) {
                //debug('forwarding port to callback.');
                return this.setup(this.interface, this.port, port);
            }
            else {
                //debug('forwarding without callback.');
                return this.setup(this.interface, this.port, null);
            }
        } else {
            debug('setting up listener.');
            if (this.interface != interface) {
                debug('setting new listening interface: ' + interface);
                this.interface = interface;
            }
            if (this.port != port) {
                debug('setting new listening port: ' + port);
                this.port = port;
            }
            if (cb) cb();
            return this;
        }
    }
}
chronoserver.prototype.start = function (cb) {
    debug('starting listener.');
    if (cb) {
        this.errcb = cb;
    }
    if (this.interface == '')
        this.server.listen(this.port, this.listeningListener);
    else
        this.server.listen(this.port, this.interface, this.listeningListener);
    this.server.on('error', this.errorListener);
    return this;
}
chronoserver.prototype.connectListener = function () {
    debug('someone connected.');
}
chronoserver.prototype.listeningListener = function () {
    debug('listening now.');
}
chronoserver.prototype.errorListener = function (err) {
    debug('error occured: ' + err.code)
    cb(err);
    this.start();
}


