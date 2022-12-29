import { EventEmitter } from 'stream';
import { request, ClientRequest, IncomingMessage } from 'http';
import { URL } from 'url';

class EventSource extends EventEmitter {
  private req: ClientRequest | undefined;

  constructor(private readonly url: URL) {
    super();

    this.connect();
  }

  close() {
    this.removeAllListeners();

    if(this.req) {
      this.req.removeAllListeners();
    }
  }

  private connect() {
    this.req = request(this.url, this.handleResponse.bind(this));
    this.req.on('error', (err) => this.emit('error', err));
    this.req.on('close', this.handleClose.bind(this));
    this.req.end();
  }

  private handleClose() {
    if(this.req) {
      this.req.removeAllListeners();
    }

    setTimeout(this.connect.bind(this), 500);
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
