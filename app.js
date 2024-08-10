'use strict';

const Homey = require('homey');
const dgram = require("dgram");
let currentDevices = [];

function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

class KebaApp extends Homey.App {

  addCurrentDevices(device) {
    let devObj = { id: device.getData().id, device: device };
    const index = currentDevices.indexOf(devObj);
    if (index === -1) 
    {
      currentDevices.push({ id: device.getData().id, device: device });
      this.log('Devices Registered: ' + device.getName() + ' - ' + device.getData().id)
    }
    this.log('Number of devices: ' + currentDevices.length);
  }


  removeCurrentDevices(device) {
    currentDevices = currentDevices.filter(item => item.id !== device.getData().id)
    this.log('Devices Removed: ' + device.getName() + ' - ' + device.getData().id)
    this.log('Number of devices: ' + currentDevices.length);
  }

  async onInit() {
    this.log('KebaP30 app initialized');

    // Actions
    this.homey.flow.getActionCard('set_charge_power')
      .registerRunListener((args, state) => { return args.device.chargePowerActionRunListener(args, state); });

    // Conditions
    this.homey.flow.getConditionCard('is_charging')
      .registerRunListener((args) => args.device.getCapabilityValue('charge_status'));

    // Triggers
    this.chargePowerChange = this.homey.flow.getDeviceTriggerCard('charge_power_change');
    
    // UDP listner
    let server = dgram.createSocket({ type: 'udp4', reuseAddr: true }).bind(7090);
    server.on('listening', function () {
      let adrInfo = server.address();
      console.log('Client listening on:: ' + adrInfo.address + ":" + adrInfo.port);
    })
    server.on('message', function (message, remote) {
      console.log('APP.JS: Recieved from ' + remote.address + ':' + remote.port);
      let packet = message.toString().trim();
      if (isJsonString(packet)) {
        let jsonPacket = JSON.parse(packet)
        const result = currentDevices.find(d => d.id === jsonPacket.Serial);
        try {
          switch (jsonPacket.ID) {
            case '1':
              console.log('APP.JS: Recieved message for report 1, not supported');
              break;
            case '2':
              result.device.getReport2(jsonPacket) // Crash....
              // TypeError: Cannot read properties of undefined (reading 'device')
              // at Socket.<anonymous> (/app/app.js:66:20)
              // at Socket.emit (node:events:517:28)
              // at UDP.onMessage [as onmessage] (node:dgram:942:8)
              break;
            case '3':
              result.device.getReport3(jsonPacket)
              break;
            default:
              console.log('APP.JS: Recieved unknown message: ' + packet);
              break;
          }
        } catch (error) {
          console.log('APP.JS: unexcpected error, message: ' + error);
        }
      }
      else {
        console.log('APP.JS: could not parse incomming message as JSON, message: ' + packet);
      }
    });
  }

}

module.exports = KebaApp;