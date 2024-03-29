import fetch, { Response } from 'node-fetch';
import { EventEmitter } from 'stream';
import { URL } from 'url';
import EventSource from './eventsource';

interface Logger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(message: string, ...parameters: any[]): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(message: string, ...parameters: any[]): void;
}

interface Event {
  evt: string;
}

function isAnEvent(obj: object): obj is Event {
  return obj && 'evt' in obj;
}

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

declare interface Shade {
  on(event: 'setTargetPosition', listener: (shade: Shade, position: Position) => void): this;
}

class Shade extends EventEmitter implements Shade {
  currentPositions: Position;
  targetPositions: Position;

  constructor(readonly id: number, readonly name: string, position: Position) {
    super();

    this.currentPositions = position;
    this.targetPositions = position;
  }

  setTargetPosition(position: Position): void {
    this.emit('setTargetPosition', this, position);
  }

  close(): void {
    this.removeAllListeners();
  }
}

class Hub {
  private readonly events: EventSource;
  private readonly shades: Map<number, Shade> = new Map();

  private readonly batch: Array<[Position, Shade]> = [];
  private batchTimeout: NodeJS.Timeout | undefined;

  constructor(private readonly host: URL, private readonly logger: Logger) {
    const events = new URL('/home/shades/events', host);
    this.events = new EventSource(events);
    this.events.on('event', this.handleEvent.bind(this));
    this.events.on('error', this.handleError.bind(this));
    this.events.connect();
  }

  close() {
    this.logger.info('Hub is closing');

    this.events.close();

    this.shades.forEach((shade) => {
      shade.close();
    });
  }

  async setShades(position: Position, ...ids: number[]): Promise<Response> {
    const url = new URL('/home/shades/positions', this.host);
    url.search = `ids=${ids.join(',')}`;

    this.logger.info('Calling API -> ', url);

    const res = await fetch(url, {
      method: 'PUT',
      body: JSON.stringify({ positions: position }),
      headers: {'Content-Type': 'application/json'},
    });

    const body = await res.text();

    this.logger.info('Received Response Body -> ', body);

    return res;
  }

  async getShades(): Promise<Array<Shade>> {
    const url = new URL('/home/shades', this.host);

    this.logger.info('Calling API -> ', url);

    const json = await fetch(url)
      .then(response => response.json())
      .then(response => response as Array<JSONShade>);

    const shades = json.map(j => {
      const shade = new Shade(j.id, j.ptName, j.positions);

      shade.on('setTargetPosition', this.setTargetPosition.bind(this));

      this.shades.set(j.id, shade);

      return shade;
    });

    return shades;
  }

  private setTargetPosition(shade: Shade, position: Position) {
    if(this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batch.push([position, shade]);

    this.batchTimeout = setTimeout(this.handleBatch.bind(this), 500, this.batch);
  }

  private async handleBatch(batch: Array<[Position, Shade]>) {
    const process = [...batch];
    batch.length = 0;

    const groups: Map<string, Array<Shade>> = new Map();

    process.forEach(([position, shade]) => {
      const key = JSON.stringify(position);

      const group = groups.get(key);

      if (group) {
        group.push(shade);
      } else {
        groups.set(key, [shade]);
      }
    });

    groups.forEach(async (shades, key) => {
      const position = JSON.parse(key) as Position;
      await this.setShades(position, ...shades.map((shade) => shade.id));
    });
  }

  private handleEvent(obj: object) {
    if(isAnEvent(obj)) {
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

  private handleMotionStartedEvent(event: MotionStartedEvent) {
    this.logger.info('Handling MotionStartedEvent -> ', event);

    const shade = this.shades.get(event.id);

    if(shade) {
      shade.currentPositions = event.currentPositions;
      if (event.targetPositions) {
        shade.targetPositions = event.targetPositions;
      }
    }
  }

  private handleMotionStoppedEvent(event: MotionStoppedEvent) {
    this.logger.info('Handling MotionStoppedEvent -> ', event);

    const shade = this.shades.get(event.id);

    if(shade) {
      shade.currentPositions = event.currentPositions;
    }
  }

  private handleError(error: object | string) {
    this.logger.error('error', error);
  }
}

export { Shade };
export default Hub;
