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
    this.dataCallback = null;

    this.crlf = '\r\n';
    this.errorcount = 0;
    this.MAX_HELO_ERROR = 3;

    this.clientProgramName = null;
    this.clientProgramVersion = null;
    this.clientProtocolVersion = null;
    this.clientEstablished = false;

    this.serverProgramName = 'chronoserv';
    this.serverProgramVersion = '0.0.1 2014/05/13';
    this.serverRequestLines = [ 'stream-mode=push' ];

    // define event handlers
    this.setup = function (interface, port, dataCallback) {
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
                if (dataCallback) {
                    debug('setting callback for incoming data.');
                    this.dataCallback = dataCallback;
                }
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

        this.clientEstablished = false;
        this.clientProgramName = null;
        this.clientProgramVersion = null;
        this.clientProtocolVersion = null;
        this.clientEstablished = false;
        this.stringbuffer = '';

        this.errorcount = 0;

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
        //debug('received string: ' + buff);

        this.stringbuffer += buff;

        var crlfpos = this.stringbuffer.indexOf(this.crlf);
        if (crlfpos >= 0) {
            var line = this.stringbuffer.slice(0, crlfpos);
            this.stringbuffer = this.stringbuffer.slice(crlfpos + (this.crlf.length));

            if (!this.clientEstablished) {
                // find out client version and send requestlines
                var re = /^(.*?)~(.*?)~(.*?)$/g;
                var matches = [];
                var found = re.exec(line);
                //console.log(found);
                for (var key in found) {
                    if (found.hasOwnProperty(key) && (+key) > 0) {
                        matches.push(found[key]);
                    }
                }
                //debug('found ' + matches.length + ' matches:');
                //debug(matches);
                if (matches.length == 3) {
                    this.clientProgramName = matches[0];
                    this.clientProgramVersion = matches[1];
                    this.clientProtocolVersion = matches[2];
                    this.clientEstablished = true;
                    console.log('Client established: ' + this.socket.remoteAddress + ':' + this.socket.remotePort);
                    this.socket.write(this.serverProgramName + '~' + this.serverProgramVersion + '~' + this.serverRequestLines.length + this.crlf);
                    this.serverRequestLines.forEach(function (ele, idx) {
                        this.socket.write(ele + this.crlf);
                    }, this);
                    this.socket.write('start' + this.crlf);
                } else {
                    this.errorcount++;
                    if (this.errorcount == this.MAX_HELO_ERROR) {
                        this.socket.destroy();
                        this.socket = null;
                        this.stringbuffer = '';
                    }
                }
            } else {
                // deal with data
                debug('received string: ' + line);
                if (line == 'ping') {
                    this.socket.write('ack~ping');
                } else {
                    var reg = /^(CT01_33)~([0-9]{1,6})~([^,;~|\t\0]+)~([^,;~|\t\0]+)~([^,;~|\t\0]+)~([0-9]{1,3})~([0-9a-zA-Z]{6})~([0-9]{1,2})$/gi
                    //          0:line def 1:seq number 2:location          3:tag              4:time               5:lap count  6:reader id      7:gator number
                    var matches = [];
                    var found = reg.exec(line);
                    for (var key in found) {
                        if (found.hasOwnProperty(key) && (+key) > 0) {
                            matches.push(found[key]);
                        }
                    }
                    var lineinfo = {
                        sequenceNumber: matches[1],
                        location: matches[2],
                        tag: matches[3],
                        time: matches[4],
                        lapcount: matches[5],
                        readerId: matches[6],
                        gatorNumber: matches[7]
                    }
                    if (this.dataCallback)
                        this.dataCallback(lineinfo);
                }

            }
        }

    }
    this.onEnd = function () {
        if (this.socket) {
            this.socket.end();
            this.socket = null;
        }
    }
    
    // run the show
    this.server = net.createServer(this.onConnect.bind(this));

}



