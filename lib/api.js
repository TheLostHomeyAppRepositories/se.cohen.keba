'use strict';

const dgram = require("dgram");

class KebaApi {

    constructor(settings) {
        this.settings = settings;
    }

    async getReport1() {
        // NOTE: Send UDP by Callback - then close stream not to break for other calls.
        /* Response:
        {
            "ID": "1",
            "Product": "KC-P30-EC2201C2-E00-CL",
            "Serial": "18235522",
            "Firmware":"P30 v 3.10.28 (210316-115052)",
            "COM-module": 1,    // not P20
            "Backend": 0,       // not documented
            "timeQ": 3,         // not documented
            "DIP-Sw1": "0x24",  // not documented
            "DIP-Sw2": "0x08",  // not documented
            "Sec": 225058       // not P20
        }
        */
        return this._sendUDPasCallback('report 1')
            .then(response => {
                return JSON.parse(response);
            });
    }

    getReport2() {
        /* Response:
        {
            "ID": "2",
            "State": 2,
            "Error1": 0,
            "Error2": 0,
            "Plug": 7,  
            "AuthON": 0,        // not documented
            "Authreq": 0,       // not documented
            "Enable sys": 1,
            "Enable user": 1,
            "Max curr": 13000,
            "Max curr %": 216,
            "Curr HW": 13000,
            "Curr user": 16000,
            "Curr FS": 0,
            "Tmo FS": 0,
            "Curr timer": 0,    // not P20
            "Tmo CT": 0,        // not P20
            "Setenergy": 0,     // not P20
            "Output": 0,
            "Input": 0,
            "Serial": "18235522",
            "Sec": 225191
        }
        */
        this._sendUDP('report 2')
    }

    getReport3() {
        /* Response:
        {
            "ID": "3",
            "U1": 226,
            "U2": 231,
            "U3": 228,
            "I1": 0,
            "I2": 0,
            "I3": 0,
            "P": 0,
            "PF": 0,
            "E pres": 242901,
            "E total": 86291394,
            "Serial": "18235522",
            "Sec": 225257
        }
        */
        this._sendUDP('report 3')
    }

    setOn() {
        /* Response: 
        TCH-OK :done
        */
        this._sendUDP('ena 1')
    }

    setOff() {
        /* Response: 
        TCH-OK :done
        */
        this._sendUDP('ena 0')
    }

    limit(number) {
        /* Response: 
        TCH-OK :done
        */
        this._sendUDP('curr ' + number)
    }

    _sendUDP(input) {
        // let client = dgram.createSocket('udp4');
        let client = dgram.createSocket({ type: 'udp4', reuseAddr: true }) // .bind(this.settings.port);
        let text = Buffer.from(input);
        client.on('error', function (error) {
            console.log('Error _sendUDP: ' + error);
            client.close();
        });
        client.send(text, 0, text.length, this.settings.port, this.settings.ip, function (error) {
            if (error) {
                console.log(error);
            } else {
                console.log('Sent message: ' + text);
            }
            client.close()
        });
    }

    async _sendUDPasCallback(input) {
        // Need to reconstruct this...
        const promise = () => {
            return new Promise((resolve, reject) => {
                this._sendUDPasCallback2(input, this.settings, (err, data) => {
                    if (err) return reject(err)
                    resolve(data)
                })
            })
        }
        return promise()
            .then(data => {
                // console.log("SUCCESS:: ")
                // console.log(data)
                return data
            })
            .catch(err => {
                // console.log("ERROR:: ")
                // console.log(err)
                return err
            })
    }

    _sendUDPasCallback2(input, settings, callback) {
        let client = dgram.createSocket({ type: 'udp4', reuseAddr: true }).bind(this.settings.port);
        let text = Buffer.from(input);
        client.on('message', function (message, remote) {
            client.close();
            if (settings.ip === remote.address) {
                console.log('API.JS: Recieved response from ' + remote.address + ':' + remote.port);
                console.log(message.toString().trim());
                callback(message.toString().trim());
            }
            else {
                console.log('API.JS: Error, got a message from wrong device');
                callback('Error: Wrong device error');
            }
        });
        client.on('error', function (error) {
            client.close();
            console.log('API.JS: Error _sendUDPasCallback2: ' + error);
            callback(error);
        });
        client.send(text, 0, text.length, settings.port, settings.ip, function (error) {
            if (error) {
                client.close();
                console.log(error);
            } else {
                console.log('API.JS: Sent message: ' + text);
            }
        });
    }
}

module.exports = { KebaApi };