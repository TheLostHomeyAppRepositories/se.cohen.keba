'use strict';

const { Device } = require('homey');
const api = require('../../lib/api');

class KebaP30Device extends Device {

  async onInit() {
    this.log('KebaP30Device has been initialized for: ', this.getName());
    this.homey.app.addCurrentDevices(this) // register for events
    try {
      setTimeout(() => {
        // https://github.com/athombv/homey-apps-sdk-issues/issues/200
        this.setAvailable().catch(this.error);
      }, 1000);
      this.SetCapabilities();
      this.registerCapabilityListener('onoff', this.onCapabilityButton.bind(this));
      this.registerCapabilityListener('charge_power_selector', this.onCapabilityPicker.bind(this));
      this.fetchData();
      this.pollingInterval = this.homey.setInterval(() => { this.fetchData(); }, 10000);
    }
    catch (e) {
      this.log("onInit problems: ", e);
    }
  }

  SetCapabilities() {
    if (this.hasCapability('measure_energy_current') === false) {
      this.log('Added measure_energy_current capabillity ');
      this.addCapability('measure_energy_current');
    }
    if (this.hasCapability('measure_energy_total') === false) {
      this.log('Added measure_energy_total capabillity ');
      this.addCapability('measure_energy_total');
    }
    if (this.hasCapability('charge_power_selector') === false) {
      this.log('Added charge_power_selector capabillity ');
      this.addCapability('charge_power_selector');
    }
  }

  getReport2(result) {
    this.log('-> enter getReport2');
    this.log(result);
    this.SetChargePower(result['Curr user']);
    this.setCapabilityValue('onoff', (result['Enable sys'] === 1 && result['Enable user'] === 1));
    this.setCapabilityValue('plug_status', (result.Plug === 5 || result.Plug === 7));
    this.setCapabilityValue('charge_status', (result.State === 3));
  }

  getReport3(result) {
    this.log('-> enter getReport3');
    this.log(result);
    this.setCapabilityValue('measure_voltage_1', this.GetValue(result.U1));
    this.setCapabilityValue('measure_voltage_2', this.GetValue(result.U2));
    this.setCapabilityValue('measure_voltage_3', this.GetValue(result.U3));
    this.setCapabilityValue('measure_current_1', (this.GetValue(result.I1) === 0) ? 0 : this.GetValue(result.I1) / 1000);
    this.setCapabilityValue('measure_current_2', (this.GetValue(result.I2) === 0) ? 0 : this.GetValue(result.I2) / 1000);
    this.setCapabilityValue('measure_current_3', (this.GetValue(result.I3) === 0) ? 0 : this.GetValue(result.I3) / 1000);
    this.setCapabilityValue('measure_power', (this.GetValue(result.P) === 0) ? 0 : this.GetValue(result.P) / 1000);
    this.setCapabilityValue('measure_energy_current', (this.GetValue(result['E pres']) === 0) ? 0 : this.GetValue(result['E pres']) / 10000);
    this.setCapabilityValue('measure_energy_total', (this.GetValue(result['E total']) === 0) ? 0 : this.GetValue(result['E total']) / 10000);
  }

  fetchData() {
    this.log('-> enter fetchData');
    try {
      const settings = this.getSettings()
      let kebaApi = new api.KebaApi(settings);
      setTimeout(() => {
        kebaApi.getReport2()
      }, 100);
      setTimeout(() => {
        kebaApi.getReport3()
      }, 1100);
    }
    catch (error) {
      this.log("fetchData problems: ", error);
    }
  }

  GetValue(val) {
    if (val == undefined)
      return 0;
    else
      return val;
  }

  SetChargePower(value) {
    let currentChargePower = this.getCapabilityValue('charge_power') * 1000;
    if (currentChargePower != value && value != 0) {
      currentChargePower = value;
      const tokens = {
        charge_power: value / 1000,
      };
      this.homey.app.chargePowerChange.trigger(this, tokens, {}).catch(this.error);
      this.setCapabilityValue('charge_power', currentChargePower / 1000);
    }
    let validChargePower = this.GetValidChargePower(currentChargePower);
    if (validChargePower == currentChargePower) {
      this.setCapabilityValue('charge_power_selector', currentChargePower.toString());
    }
    else {
      this.setCapabilityValue('charge_power_selector', "0");
    }
  }

  GetValidChargePower(input) {
    var valid = [6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 20000, 24000, 28000, 32000, 63000];
    var closest = valid.reduce(function (prev, curr) {
      return (Math.abs(curr - input) < Math.abs(prev - input) ? curr : prev);
    });
    return closest;
  }

  async onCapabilityPicker(opts) {
    this.log('-> onCapabilityPicker is changeed');
    const settings = this.getSettings();
    let kebaApi = new api.KebaApi(settings);
    let value = parseInt(opts);
    if (value != 0) {
      kebaApi.limit(value);
    }
    this.SetChargePower(value);
  }

  async chargePowerActionRunListener(args, state) {
    this.log('-> Set charge power listner');
    const settings = this.getSettings();
    let kebaApi = new api.KebaApi(settings);
    kebaApi.limit(args.charge_power * 1000)
    this.SetChargePower(args.charge_power * 1000)
  }

  async onCapabilityButton(opts) {
    this.log('-> onCapabilityButton is clicked');
    const settings = this.getSettings()
    let kebaApi = new api.KebaApi(settings);
    if (opts === true) {
      kebaApi.setOn()
      this.setCapabilityValue('onoff', true);
    }
    else {
      kebaApi.setOff()
      this.setCapabilityValue('onoff', false);
    }
  }

  async onAdded() {
    this.log('KebaP30Device has been added');
    // this.homey.app.addCurrentDevices(this)
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('KebaP30Device settings where changed');
  }

  async onRenamed(name) {
    this.log('KebaP30Device was renamed');
  }

  async onDeleted() {
    this.log('KebaP30Device has been deleted');
    this.homey.app.removeCurrentDevices(this)
    clearInterval(this.pollingInterval);
  }

  async onDiscoveryResult(discoveryResult) {
    this.log("KebaP30Device onDiscoveryResult");
    return discoveryResult.id === this.getData().id;
  }

  async onDiscoveryAvailable(discoveryResult) {
    this.log("KebaP30Device onDiscoveryAvailable");
    // This method will be executed once when the device has been found (onDiscoveryResult returned true)
    this.setAvailable();
    this.log('in onDiscoAvailable, IP =', this.getSettings().ip);
    this.log('discoveryResult = ', discoveryResult.address);
    this.log(discoveryResult);
    const settings = this.getSettings()
    if (settings.discovery)
      this.setSettings({ ip: discoveryResult.address });
  }

  async onDiscoveryAddressChanged(discoveryResult) {
    this.log("KebaP30Device onDiscoveryAddressChanged");
    // Update your connection details here, reconnect when the device is offline
    this.log('in onDiscoAddrChange, IP =', this.getSettings().ip);
    this.log('discoveryResult = ', discoveryResult.address);
    this.log(discoveryResult);
    const settings = this.getSettings()
    if (settings.discovery)
      this.setSettings({ ip: discoveryResult.address });
  }

  async onDiscoveryLastSeenChanged(discoveryResult) {
    this.log("KebaP30Device onDiscoveryLastSeenChanged");
    // When the device is offline, try to reconnect here
    this.log('in onDiscoLastSeenChanged, IP =', this.getSettings().ip)
    this.log('discoveryResult = ', discoveryResult.address);
    this.log(discoveryResult);
    const settings = this.getSettings()
    if (settings.discovery)
      this.setSettings({ ip: discoveryResult.address });
  }

}

module.exports = KebaP30Device;