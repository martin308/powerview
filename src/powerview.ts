import fetch, { Response } from 'node-fetch';

type WebShade = {
  id: number;
  ptName: string;
  host: string;
  positions: {
    primary: number;
  };
};

async function getShades(host: string): Promise<Array<WebShade>> {
  return fetch(`${host}/home/shades`)
    .then(response => response.json())
    .then(response => response as Array<WebShade>)
    .then(shades => shades.map(shade => Object.assign(shade, { host: host })));
}

async function setShade(shade: WebShade, position: number): Promise<Response> {
  return fetch(`${shade.host}/home/shades/postitions?ids=${shade.id}`, {
    method: 'PUT',
    body: JSON.stringify({ positions: { primary: position } }),
    headers: {'Content-Type': 'application/json'},
  });
}

async function getShade(shade: WebShade): Promise<WebShade> {
  return fetch(`${shade.host}/home/shades/${shade.id}`)
    .then(response => response.json())
    .then(response => response as WebShade)
    .then(s => Object.assign(s, { host: shade.host }));
}

export {
  getShades,
  getShade,
  setShade,
  WebShade,
};
