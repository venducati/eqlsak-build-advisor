'use strict';
const { open } = require('node:fs/promises');
const { StringDecoder } = require('node:string_decoder');
class LogTail {
  constructor(path) {
    this.path = path;
    this.offset = 0;
    this.identity = '';
    this.decoder = new StringDecoder('utf8');
    this.skip = false;
  }
  async start() {
    const f = await open(this.path, 'r');
    try {
      const s = await f.stat();
      if (!s.isFile()) throw new Error('Select a regular log file.');
      this.identity = s.ino + ':' + s.birthtimeMs;
      this.offset = s.size;
      if (s.size) {
        const b = Buffer.alloc(1);
        await f.read(b, 0, 1, s.size - 1);
        this.skip = b[0] !== 10;
      }
      return { skipPartial: this.skip };
    } finally {
      await f.close();
    }
  }
  async poll() {
    const f = await open(this.path, 'r');
    try {
      const s = await f.stat();
      const identity = s.ino + ':' + s.birthtimeMs;
      const reset = identity !== this.identity || s.size < this.offset;
      if (reset) {
        this.offset = 0;
        this.identity = identity;
        this.decoder = new StringDecoder('utf8');
      }
      const n = Math.min(262144, Math.max(0, s.size - this.offset));
      let text = '';
      if (n) {
        const b = Buffer.alloc(n);
        const r = await f.read(b, 0, n, this.offset);
        this.offset += r.bytesRead;
        text = this.decoder.write(b.subarray(0, r.bytesRead));
      }
      return { text, reset, backlog: s.size - this.offset };
    } finally {
      await f.close();
    }
  }
}
module.exports = { LogTail };
