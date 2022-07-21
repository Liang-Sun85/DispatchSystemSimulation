
class MyClient {
  constructor(cb) {
    this.path = require("path");
    this.net = require('net');
    this.bytebuffer = require('bytebuffer');

    var self = this;
    this.socket = new this.net.Socket();
    this.socket.on('error', function (data) { self.onError(data); });
    this.socket.on('close', function (data) { self.onClose(data); });
    this.socket.on('connect', function () { self.onConnect(); });
    this.socket.on('data', function (data) { self.onData(data); });

    // 队列的长度(1M)
    this.buffer = new this.bytebuffer(1024 * 1024, false);
    this.buffer.flip();
    this.need = 16;
    this.ishead = true;
    this.datacb = cb;
    this.cmd = 0;
    this.port = 0;
    this.connect_error = false;
  }

  log(log) {
    console.log(log);
  }

  connect(ip, port) {
    this.port = port;
    this.starttime = Date.now();
    this.socket.connect({ port: port, host: ip });
  }

  end() {
    this.log("socket end");
    clearTimeout(this.heartbeat);
    if (this.socket) {
      //this.socket.destroy();
      this.socket.end(() => { this.socket.destroy(); });
    }
  }

  heartbeatEnd() {
    this.connect_error = true;
    this.end();
  }

  onConnect() {
    let ping = Date.now() - this.starttime;
    let data = { 'connection': 'ok', 'ping': ping };
    this.datacb(this.port, 1, JSON.stringify(data));
    this.heartbeat = setTimeout(() => { this.heartbeatEnd(); }, 3000);
  }

  onClose(bErr) {
    this.log("on close, error = " + bErr);
    let err = bErr || this.connect_error;
    let data = { 'connection': 'close', 'error': err };
    this.datacb(this.port, 1, JSON.stringify(data));
    this.socket = null;
  }

  onError(data) {
    this.log(data);
  }

  onData(data) {
    this.buffer.append(data.buffer, this.buffer.limit);
    this.buffer.limit += data.length;

    while (this.buffer.remaining() >= this.need) {
      if (this.ishead) {
        //console.log("read head");
        let header = this.buffer.readUint8();
        let ver = this.buffer.readUint8();
        let number = this.buffer.readUint16();
        let length = this.buffer.readUint32();
        this.cmd = this.buffer.readUint16();
        let res = this.buffer.readBytes(6);
        if (this.cmd != 19301) {
          console.log("header=" + header + ", ver=" + ver + ", number=" + number + ", length=" + length + ", cmd=" + this.cmd);
        }
        this.need = length;
        this.ishead = false;
      } else {
        //console.log("read body");
        let buf = this.buffer.readBytes(this.need);
        let data_str = buf.toUTF8();
        //if(this.cmd != 19301) {
        //console.log(data_str);
        //}
        if (this.cmd == 19301) {
          clearTimeout(this.heartbeat);
          this.heartbeat = setTimeout(() => { this.heartbeatEnd(); }, 3000);
        }
        if (data_str.length > 0 && this.datacb != undefined) {
          this.datacb(this.port, this.cmd, data_str);
        }
        this.need = 16;
        this.ishead = true;
      }
      if (this.buffer.remaining() == 0) {
        this.buffer.offset = 0;
        this.buffer.limit = 0;
      }
    }
  }

  send(cmd, content) {
    if (content != null) {
      var data_buf = new this.bytebuffer();
      data_buf.writeUTF8String(content);
      data_buf.flip();
      var data = data_buf.toBuffer();
      //var data_array = data_buf.toArrayBuffer();
    }

    let head_buf = new this.bytebuffer(16, false);
    head_buf.writeUint8(90);
    head_buf.writeUint8(1);
    head_buf.writeUint16(1);
    head_buf.writeUint32(content == null ? 0 : data_buf.limit);
    head_buf.writeUint16(cmd);
    head_buf.writeUint16(0);
    head_buf.writeUint32(0);
    head_buf.flip();
    let head = head_buf.toBuffer();

    //let head = new Uint8Array(head_array);
    /*this.socket.write(head);

    if (content != null) {
      //let data = new Uint8Array(data_array);
      this.socket.write(data);
    }*/
    if (content == null) {
      this.socket.write(head);
    } else {
      let send_data = Buffer.concat([head, data]);
      this.socket.write(send_data);
    }
  }
}

//module.exports = MyClient;
module.exports = MyClient;