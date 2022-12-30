import { MockServer } from 'jest-mock-server';
import Hub, { Shade } from './hub';

describe('hub', () => {
  const server = new MockServer();

  beforeAll(() => server.start());
  afterAll(() => server.stop());
  beforeEach(() => server.reset());

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

  test('hub', async () => {
    server.get('/home/shades/events').mockImplementation((ctx) => {
      ctx.status = 200;
    });

    server.get('/home/shades').mockImplementation((ctx) => {
      ctx.body = JSON.stringify([{ id: 1, ptName: 'shade name' }]);
      ctx.status = 200;
    });

    const route = server.put('/home/shades/positions').mockImplementation((ctx) => {
      ctx.status = 200;
    });

    const host = server.getURL();

    const logger = {
      error: jest.fn(),
      info: jest.fn(),
    };

    const hub = new Hub(host, logger);

    let shades = await hub.getShades();

    expect(shades).toHaveLength(1);

    const [shade] = shades;

    shade.setTargetPosition({ primary: 1 });

    shades = await hub.getShades();

    expect(shades).toHaveLength(1);

    expect(route).toHaveBeenCalledWith(
      expect.objectContaining({
        originalUrl: '/home/shades/positions?ids=1',
        method: 'PUT',
        request: expect.objectContaining({
          body: { positions: { primary: 1 } },
        }),
      }),
      expect.any(Function),
    );

    hub.close();
  });
});
