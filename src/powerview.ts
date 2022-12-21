import fetch from 'node-fetch';

interface WebShadeJSON {
  id: number;
  ptNname: string;
}

class WebShade {
  constructor(public id: number, public ptName: string) {
  }

  static fromJSON(json: WebShadeJSON): WebShade {
    const shade = Object.create(WebShade.prototype);

    return Object.assign(shade, json);
  }
}

function getShades(host: string): Promise<Array<WebShade>> {
  return fetch(`${host}/home/shades`)
    .then(response => response.json())
    .then(response => response as Array<WebShade>);
}

export {
  getShades,
  WebShade,
};
