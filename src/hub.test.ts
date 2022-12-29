import { Shade } from './hub';

describe('hub', () => {
  test('shade', () => {
    expect.assertions(2);

    const shade = new Shade(1, 'test', { primary: 0 });

    shade.on('setTargetPosition', (shade, position) => {
      expect(shade.id).toEqual(1);
      expect(position.primary).toEqual(1);
    });

    shade.setTargetPosition({ primary: 1 });

    shade.close();
  });
});
