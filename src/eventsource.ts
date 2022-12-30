import { EventEmitter } from 'stream';
import { request, ClientRequest, IncomingMessage } from 'http';
import { URL } from 'url';

declare interface EventSource {
  on(event: 'event', listener: (arg0: object) => void): this;
  on(event: 'error', listener: (arg0: object | string) => void): this;
}

class EventSource extends EventEmitter {
  private req: ClientRequest | undefined;

  private readonly timeouts: Array<NodeJS.Timeout> = [];

  constructor(private readonly url: URL) {
    super();
  }

  close() {
    this.removeAllListeners();

    this.timeouts.forEach(timeout => {
      clearTimeout(timeout);
    });

    if(this.req) {
      this.req.removeAllListeners();
      this.req.destroy();
    }
  }

  connect() {
    this.req = request(this.url, this.handleResponse.bind(this));
    this.req.on('error', (err) => this.emit('error', err));
    this.req.on('abort', () => this.emit('error', 'abort'));
    this.req.on('close', this.handleClose.bind(this));
    this.req.end();
  }

  private handleClose() {
    if(this.req) {
      this.req.removeAllListeners();
    }

    this.timeouts.push(setTimeout(this.connect.bind(this), 500));
  }

  private handleResponse(res: IncomingMessage) {
    res.setEncoding('utf8');
    res.on('data', this.handleData.bind(this));
  }

  private handleData(chunk: string) {
    try {
      const json = JSON.parse(chunk);
      this.emit('event', json);
    } catch (error) {
      this.emit('error', error);
    }
  }
}

export default EventSource;
