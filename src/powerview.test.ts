import fetch, { enableFetchMocks } from 'jest-fetch-mock';

enableFetchMocks();

import { getShades, getShade } from './powerview';


describe('powerview', () => {
  test('getShades', async () => {
    fetch.mockResponseOnce(JSON.stringify([{
    }]));

    const shades = await getShades('http://192.168.10.232');

    expect(shades).toHaveLength(1);

    fetch.mockResponse(JSON.stringify({
    }));

    shades.forEach(async s => {
      const shade = await getShade(s);
      expect(shade).toEqual(s);
    });
  });
});
