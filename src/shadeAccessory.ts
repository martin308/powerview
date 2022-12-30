import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { Shade } from './hub';

import { PowerViewHomebridgePlatform } from './platform';

export class ShadeAccessory {
  private windowCoveringService: Service;

  constructor(
    private readonly platform: PowerViewHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly shade: Shade,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Hunter Douglas')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.windowCoveringService = this.accessory.getService(this.platform.Service.WindowCovering) ||
      this.accessory.addService(this.platform.Service.WindowCovering);

    this.windowCoveringService.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(this.getCurrentPosition.bind(this));

    this.windowCoveringService.getCharacteristic(this.platform.Characteristic.PositionState)
      .onGet(this.getPositionState.bind(this));

    this.windowCoveringService.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onGet(this.getTargetPosition.bind(this))
      .onSet(this.setTargetPosition.bind(this));
  }

  async getCurrentPosition(): Promise<CharacteristicValue> {
    this.platform.log.debug('Triggered GET CurrentPosition');

    return this.shade.currentPositions.primary * 100;
  }

  async getPositionState(): Promise<CharacteristicValue> {
    this.platform.log.debug('Triggered GET PositionState');

    switch (true) {
      case this.shade.currentPositions.primary > this.shade.targetPositions.primary:
        return this.platform.Characteristic.PositionState.INCREASING;
      case this.shade.currentPositions.primary < this.shade.targetPositions.primary:
        return this.platform.Characteristic.PositionState.DECREASING;
      default:
        return this.platform.Characteristic.PositionState.STOPPED;
    }
  }

  async getTargetPosition(): Promise<CharacteristicValue> {
    this.platform.log.debug('Triggered GET TargetPosition');

    return this.shade.targetPositions.primary * 100;
  }

  setTargetPosition(value: CharacteristicValue) {
    // in homekit land
    // 100 is open
    // 0 is closed?

    // in powerview land
    // 1 is open
    // 0 is closed
    this.platform.log.debug('Set Target Position -> ', value);

    if (typeof value === 'number') {
      const newValue = value / 100;
      this.shade.setTargetPosition({ primary: newValue });
    }
  }
}
