import fetch, { Response } from 'node-fetch';
import { URL } from 'url';
import EventSource from './eventsource';

type JSONShade = {
  id: number;
  ptName: string;
  positions: {
    primary: number;
  };
};

interface MotionStoppedEvent {
  evt: string;
  id: number;
  currentPositions: Position;
}

interface MotionStartedEvent {
  evt: string;
  id: number;
  currentPositions: Position;
  targetPositions?: Position;
}

type Position = {
  primary: number;
};

interface Shade {
  readonly name: string;
  getCurrentPosition(): Position;
  getTargetPosition(): Position;
  setTargetPosition(position: Position): void;
}

class Shade implements Shade {
  currentPositions: Position;
  targetPositions: Position;

  constructor(private readonly hub: Hub, private readonly id: number, readonly name: string, position: Position) {
    this.currentPositions = position;
    this.targetPositions = position;
  }

  getCurrentPosition(): Position {
    return this.currentPositions;
  }

  getTargetPosition(): Position {
    return this.targetPositions;
  }

  setTargetPosition(position: Position): void {
    this.hub.setShades(position, this.id);
  }
}

class Hub {
  private readonly events: EventSource;
  private readonly shades: Map<number, Shade> = new Map();

  constructor(private readonly host: URL) {
    const events = new URL('/home/shades/events', host);
    this.events = new EventSource(events);
    this.events.on('event', this.handleEvent.bind(this));
    this.events.connect();
  }

  close() {
    this.events.close();
  }

  async setShades(position: Position, ...ids: number[]): Promise<Response> {
    const url = new URL('/home/shades/postitions', this.host);
    url.search = `ids=${ids.join(',')}`;
    return fetch(url, {
      method: 'PUT',
      body: JSON.stringify({ positions: { primary: position } }),
      headers: {'Content-Type': 'application/json'},
    });
  }

  async getShades(): Promise<Array<Shade>> {
    const url = new URL('/home/shades', this.host);
    const json = await fetch(url)
      .then(response => response.json())
      .then(response => response as Array<JSONShade>);

    const shades = json.map(j => {
      const shade = new Shade(this, j.id, j.ptName, j.positions);

      this.shades.set(j.id, shade);

      return shade;
    });

    return shades;
  }

  private handleEvent(obj: any) {
    if('evt' in obj) {
      if (typeof obj.evt === 'string') {
        switch (obj.evt) {
          case 'motion-started':
            this.handleMotionStartedEvent(obj as MotionStartedEvent);
            break;
          case 'motion-stopped':
            this.handleMotionStoppedEvent(obj as MotionStoppedEvent);
            break;
          case 'shade-offline':
          case 'shade-online':
          case 'battery-alert':
            break;
        }
      }
    }
  }

  private handleMotionStartedEvent(event: MotionStartedEvent) {
    const shade = this.shades.get(event.id);

    if(shade) {
      shade.currentPositions = event.currentPositions;
      if (event.targetPositions) {
        shade.targetPositions = event.targetPositions;
      }
    }
  }

  private handleMotionStoppedEvent(event: MotionStoppedEvent) {
    const shade = this.shades.get(event.id);

    if(shade) {
      shade.currentPositions = event.currentPositions;
    }
  }
}

export { Shade };
export default Hub;
