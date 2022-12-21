import fetch from 'node-fetch';

type WebShade = {
  id: number;
  ptName: string;
  host: string;
};

async function getShades(host: string): Promise<Array<WebShade>> {
  return fetch(`${host}/home/shades`)
    .then(response => response.json())
    .then(response => response as Array<WebShade>)
    .then(shades => shades.map(shade => Object.assign(shade, { host: host })));
}

async function setShade(shade: WebShade, position: number) {
  return fetch(`${shade.host}/home/shades/postitions?ids=${shade.id}`, {
    method: 'PUT',
    body: JSON.stringify({ positions: { primary: position } }),
    headers: {'Content-Type': 'application/json'},
  });
}

export {
  getShades,
  setShade,
  WebShade,
};
