class IoHelper {
  constructor(io, Service) {
    this.io = io;
    this.Service = Service;

    this.io.on("connection", socket => {  // 客户端链接成功
      console.log("socketIO connect");
      socket.on("vehicleData", msg => {  // 监听的频道必须和客户端监听的频道相同，等待消息
        console.log(msg);
        if (msg.getDate == true) {
          this.getVehicles(socket);
        } else {
          clearTimeout(this.vehicleDataTimer);
        }
      });

      socket.on("RouteData", msg => {  // 监听的频道必须和客户端监听的频道相同，等待消息
        console.log(msg);
        if (msg.getDate == true) {
          this.getCurrentRoute(socket);
        } else {
          clearTimeout(this.RouteDataTimer);
        }
      });

      socket.on("FlowData", msg => {  // 监听的频道必须和客户端监听的频道相同，等待消息
        console.log(msg);
        if (msg.getDate == true) {
          this.getCurrentFlow(socket);
        } else {
          clearTimeout(this.FlowDateTimer);
        }
      });

      socket.on("disconnect", _ => {  // 客户端断开链接
        console.log("socketIO disconnect");
      });

    });
  }

  getVehicles(socket) {
    socket.emit("vehicleData", this.Service.VehiclesService.getVehicles());
    this.vehicleDataTimer = setTimeout(() => { this.getVehicles(socket) }, 1000);
  }

  getCurrentRoute(socket) {
    socket.emit("RouteData", this.Service.runningDriveOrder());
    this.RouteDataTimer = setTimeout(() => { this.getCurrentRoute(socket) }, 1000);
  }

  getCurrentFlow(socket) {
    socket.emit("FlowData", this.Service.trafficResource.getFlows());
    this.FlowDateTimer = setTimeout(() => { this.getCurrentFlow(socket) }, 1000);
  }

}

module.exports = IoHelper;