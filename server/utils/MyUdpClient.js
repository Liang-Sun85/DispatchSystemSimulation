class MyUdpClient{
    constructor(cb){
        this.dgram = require("dgram");

        var self = this;
        this.socket = this.dgram.createSocket("udp4");
        this.socket.bind(function () {
            self.socket.setBroadcast(true);
        });

        this.datacb = cb;
        this.socket.on('message', function (msg,rinfo) {
            console.log('UDP receive message: '+ msg);
            let data = JSON.parse(msg);
            self.datacb(data);
        })
    }

    sendBroadcast() {
        let data = {'identifier':'CHAIR'}
        let message = JSON.stringify(data);
        console.log('UDP sendBroadcast');
        this.socket.send(message, 0, message.length, 49696, '255.255.255.255');
    }
}

//export default MyUdpClient;
module.exports = MyUdpClient;