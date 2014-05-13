var net = require('net');
var debug = require('debug')('chrono');
var _ = require('underscore');

module.exports.createServer = createServer;

function createServer() {
    return new chronoserver();
}

function chronoserver() {
    // set basic data
    this.interface = '';
    this.port = 61611;
    this.stringbuffer = '';
    this.socket = null;

    // define event handlers
    this.setup = function (interface, port, cb) {
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
    this.start = function (cb) {
        this.stringbuffer = '';
        if (this.socket) {
            debu('terminating old socket.');
            this.socket.end();
            this.socket = null;
        }
        debug('starting listener.');
        if (cb) {
            this.errcb = cb;
        }
        if (this.interface == '')
            this.server.listen(this.port, this.onListen.bind(this));
        else
            this.server.listen(this.port, this.interface, this.onListen.bind(this));
        this.server.on('error', this.onError.bind(this));
        return this;
    }
    this.onConnect = function (sock) {
        this.socket = sock;
        debug('someone connected from: ' + sock.remoteAddress + ':' + sock.remotePort);
        sock.setEncoding('utf8');
        sock.setNoDelay(true);
        sock.setKeepAlive(true, 10000);
        sock.on('data', this.onData.bind(this));
        sock.on('end', this.onEnd.bind(this));
    }
    this.onListen = function () {
        debug('listening now.');
    }
    this.onError = function (err) {
        debug('error occured: ' + err.code)
        cb(err);
        this.start();
    }
    this.onData = function (buff) {
        debug('receiving data: ' + buff.length + ' bytes.');
        debug(buff);
    }
    this.onEnd = function() {
        
    }
    
    // run the show
    this.server = net.createServer(this.onConnect.bind(this));

}



