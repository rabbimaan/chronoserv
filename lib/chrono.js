var net = require('net');
var _ = require('underscore');

module.exports.createServer = createServer;

function createServer() {
    return new ChronoServer();
}

// the server object. each server listens to 1 port on either 1 or all interfaces
function ChronoServer() {
    // set basic data
    this.interface = '';
    this.port = 61611;

    this.dataCallback = null;
    //this.errorCallback = null;
    this.errcb = null;

    this.crlf = '\r\n';
    this.MAX_HELO_ERROR = 3;

    this.serverProgramName = 'chronoserv';
    this.serverProgramVersion = '0.0.2 2014/05/13';
    this.serverRequestLines = [ 'stream-mode=push' ];

    this.connectioncount = 0;
    this.connections = {};

    // connection object handling the individual incoming data streams
    function ChronoConnection (socket, server, connectionid) {
        this.stringbuffer = '';
        this.socket = socket;
        this.server = server;
        this.id = connectionid;
        this.errorcount = 0;

        this.clientProgramName = null;
        this.clientProgramVersion = null;
        this.clientProtocolVersion = null;
        this.clientEstablished = false;

        this.socket.setEncoding('utf8');
        this.socket.setNoDelay(true);
        this.socket.setKeepAlive(true, 10000);

        // define handlers
        this.onData = function (buff) {
            console.log('receiving data: ' + buff.length + ' bytes.');
            if (buff.indexOf(this.server.crlf) == buff.length-2)
                console.log('received buffer: "' + buff.slice(0, buff.length-2) + '"');
            else
                console.log('received buffer: "' + buff + '"');

            // add incoming data to general socket data buffer
            this.stringbuffer += buff;

            // if a complete line has been received, process it
            var crlfpos = this.stringbuffer.indexOf(this.server.crlf);
            if (crlfpos >= 0) {
                var line = this.stringbuffer.slice(0, crlfpos);
                this.stringbuffer = this.stringbuffer.slice(crlfpos + (this.server.crlf.length));

                if (!this.clientEstablished) {
                    // find out client version and send requestlines
                    var re = /^([^~]+?)~([^~]+?)~([^~]+?)$/g;
                    var matches1 = [];
                    var found1 = re.exec(line);
                    for (var key1 in found1) {
                        if (found1.hasOwnProperty(key1) && (+key1) > 0) {
                            matches1.push(found1[key1]);
                        }
                    }
                    if (matches1.length == 3) {
                        this.clientProgramName = matches1[0];
                        this.clientProgramVersion = matches1[1];
                        this.clientProtocolVersion = matches1[2];
                        this.clientEstablished = true;
                        console.log('Client established: ' + this.socket.remoteAddress + ':' + this.socket.remotePort);
                        this.socket.write(this.server.serverProgramName + '~' + this.server.serverProgramVersion + '~' + this.server.serverRequestLines.length + this.server.crlf);
                        this.server.serverRequestLines.forEach(function (ele) {
                            this.socket.write(ele + this.server.crlf);
                        }, this);
                        this.socket.write('start' + this.server.crlf);
                        setTimeout(this.keepAlive.bind(this), 15000);
                    } else {
                        this.errorcount++;
                        if (this.errorcount == this.server.MAX_HELO_ERROR) {
                            this.socket.destroy();
                            this.socket = null;
                            this.stringbuffer = '';
                            delete this.server.connections[this.id];
                        }
                    }
                }
                else {
                    // deal with data
                    console.log('processing string: ' + line);
                    if ((line.trim().toLowerCase() == 'ping') || (line.trim().toLowerCase() == 'ping~ack') || (line.trim().toLowerCase() == 'ack~ping')) {
                        if (line.trim().toLowerCase() == 'ping') {
                            this.socket.write('ack~ping' + this.server.crlf);
                        } else {
                            console.log('got keepalive confirmation.');
                        }
                    } else {
                        var reg = /^(CT01_33)~([0-9]{1,6})~([^,;~|\t\0]+)~([^,;~|\t\0]+)~([^,;~|\t\0]+)~([0-9]{1,3})~([0-9a-zA-Z]{6})~([0-9]{1,2})$/gi;
                        //          0:line def 1:seq number 2:location     3:tag          4:time         5:lap count  6:reader id      7:gator number
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
                            gatorNumber: matches[7],
                            clientName: this.clientProgramName,
                            clientVersion: this.clientProgramVersion,
                            clientProtocol: this.clientProtocolVersion
                    };
                        if (this.server.dataCallback)
                            this.server.dataCallback(lineinfo);
                    }

                }
            }

        };
        this.onEnd = function () {
            if (this.socket) {
                this.socket.end();
                this.socket = null;
            }
            delete this.server.connections[this.id];
        };
        this.keepAlive = function () {
            if (this.socket != null) {
                if (this.clientEstablished) {
                    this.socket.write('ping' + this.server.crlf);
                }
                setTimeout(this.keepAlive.bind(this), 15000);
            }
        };

        // bind handlers
        this.socket.on('data', this.onData.bind(this));
        this.socket.on('end', this.onEnd.bind(this));
    }

    // define the tasks
    this.setup = function (bind_if, port, dataCallback) {
        if (!(!_.isUndefined(bind_if) && _.isString(bind_if) && ((net.isIP(bind_if) > 0) || (bind_if == '')))) {
            if (_.isFunction(bind_if)) {
                //debug('forwarding interface parameter to callback');
                return this.setup(this.interface, this.port, bind_if);
            }
            else {
                //debug('forwarding interface to port and port to callback.');
                return this.setup(this.interface, bind_if, port);
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
                console.log('setting up listener.');
                if (this.interface != bind_if) {
                    console.log('setting new listening interface: ' + bind_if);
                    this.interface = bind_if;
                }
                if (this.port != port) {
                    console.log('setting new listening port: ' + port);
                    this.port = port;
                }
                if (dataCallback) {
                    console.log('setting callback for incoming data.');
                    this.dataCallback = dataCallback;
                }
                return this;
            }
        }
    };
    this.start = function (cb) {
        console.log('starting listener.');
        if (cb) {
            this.errcb = cb;
        }
        if (this.interface == '')
            this.server.listen(this.port, this.onListen.bind(this));
        else
            this.server.listen(this.port, this.interface, this.onListen.bind(this));
        this.server.on('error', this.onError.bind(this));
        return this;
    };

    // define event handlers
    this.onConnect = function (sock) {
        this.connectioncount++;
        console.log('connection #' + this.connectioncount + ' from: ' + sock.remoteAddress + ':' + sock.remotePort);
        this.connections[this.connectioncount] = new ChronoConnection(sock, this, this.connectioncount);
    };
    this.onListen = function () {
        console.log('listening now.');
    };
    this.onError = function (err) {
        console.log('error occured: ' + err.code);
        this.errcb(err);
        this.start();
    };

    // run the show
    this.server = net.createServer(this.onConnect.bind(this));

}



