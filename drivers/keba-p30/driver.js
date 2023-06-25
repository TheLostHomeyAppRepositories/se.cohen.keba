'use strict';

const { Driver } = require('homey');
const api = require('../../lib/api');

class KebaP30Driver extends Driver {

  async onInit() {
    this.log('KebaP30Driver has been initialized');
  }

  async onPair(session) {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const defaultPort = 7090;
    let pairingError = this.homey.__('no_devices_found');
    let pairingDevice = null;

    session.setHandler('list_devices', async (data) => {
      this.log('[onPair] In list_devices with data: ', data);
      if (pairingDevice !== null) {
        this.log('[onPair] In pairingDevice not null: ', pairingDevice);
        return [pairingDevice];
      }
      const discoveryResults = discoveryStrategy.getDiscoveryResults();
      let devices = await Promise.all(Object.values(discoveryResults)
        .map(async (discoveryResult) => {
          try {
            this.log('[onPair] Discovered the following results: ', discoveryResult.address);
            let settings = {
              ip: discoveryResult.address,
              port: defaultPort
            }
            let kebaApi = new api.KebaApi(settings);
            const extraData = await kebaApi.getReport1()
            return this.GetDeviceData(extraData, discoveryResult.address, defaultPort, true);
          } catch (err) {
            this.error('Error: status of discovered device: ', discoveryResult.id, err);
            pairingError = this.homey.__('no_devices_found', err);
            return [];
          }
        }));
      this.log('-- Found Devices --')
      this.log(devices)
      let current = this.getDevices();
      this.log('-- Current Devices --')
      this.log(current)
      current.forEach(c => {
        let curId = c.getData().id;
        this.log('Current Id: ' + curId);
        devices = devices.filter(function (item) {
          return item.data.id !== curId
        })
      });
      if (devices.length > 0) {
        this.log('[onPair] Devices found: ', devices);
        return devices;
      }
      this.log('[onPair] No device found. Start manual adding with message: ', pairingError);
      session.showView('manual_pairing');
    });

    session.setHandler('get_pairing_error', async () => {
      return pairingError;
    });

    session.setHandler('set_manual_device', async (settings) => {
      this.log('[onPair]: In set_manual_device');
      let kebaApi = new api.KebaApi(settings);
      const extraData = await kebaApi.getReport1()
      try {
        pairingDevice = this.GetDeviceData(extraData, settings.ip, settings.port, false);
        this.log('[onPair]: paringDevice: ', pairingDevice);
        return Promise.resolve(pairingDevice);
      } catch (error) {
        this.log('[onPair]: error: ', error);
        return Promise.reject(error);
      }
    });
  }

  GetDeviceData(data, ip, port, useDiscovery) {
    return {
      name: data.Product + ' ' + data.Serial,
      data: {
        id: data.Serial
      },
      settings: {
        ip: ip,
        port: parseInt(port),
        discovery: useDiscovery
      },
      store: {
        product: data.Product,
        firmware: data.Firmware,
        serial: data.Serial
      }
    };
  }

}

module.exports = KebaP30Driver;