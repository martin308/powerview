import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { PowerViewHomebridgePlatform } from './platform';
import { WebShade, setShade, getShade } from './powerview';

export class Shade {
  private service: Service;

  constructor(
    private readonly platform: PowerViewHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private webShade: WebShade,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.Service.WindowCovering) ||
      this.accessory.addService(this.platform.Service.WindowCovering);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(this.getCurrentPosition.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.PositionState)
      .onGet(this.getPositionState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onGet(this.getTargetPosition.bind(this))
      .onSet(this.setTargetPosition.bind(this));
  }

  async getCurrentPosition(): Promise<CharacteristicValue> {
    this.platform.log.debug('Triggered GET CurrentPosition');

    this.webShade = await getShade(this.webShade);

    return this.webShade.positions.primary;
  }

  async getPositionState(): Promise<CharacteristicValue> {
    this.platform.log.debug('Triggered GET PositionState');

    return this.platform.Characteristic.PositionState.STOPPED;
  }

  async getTargetPosition(): Promise<CharacteristicValue> {
    this.platform.log.debug('Triggered GET TargetPosition');

    return 0;
  }

  async setTargetPosition(value: CharacteristicValue) {
    // in homekit land
    // 100 is open
    // 0 is closed?

    // in powerview land
    // 1 is open
    // 0 is closed
    this.platform.log.debug('Set Target Position -> ', value);

    if (typeof value === 'number') {
      const newValue = value / 100;
      await setShade(this.webShade, newValue);
    }
  }
}
