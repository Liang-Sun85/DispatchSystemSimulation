class MySocketHelper {
  constructor(handler) {
    var self = this;
    this.handler = handler;
    this.MyClient = require('./MyClient');
    this.MyUdpClient = require('./MyUdpClient');

    this.udpClient = new this.MyUdpClient((data) => { self.handleUDP(data); });
    this.socketList = new Map();
  }

  handleUDP(data) {
    this.handler(data.port, 0, 0, data);
  }

  handleSocket(port, cmd, data_str) {
    //console.log("handleSocket, cmd="+cmd+", data="+data_str);
    let socket_info = this.socketList.get(port);
    if (cmd == socket_info.current_cmd + 10000) {
      socket_info.ping = Date.now() - socket_info.starttime;
      this.socketList.set(port, socket_info);
    }
    let data = JSON.parse(data_str);
    if (cmd == 1 && data.connection == 'close' && this.socketList.has(port)) {
      this.socketList.delete(port);
    }
    this.handler(port, socket_info.ping, cmd, data);
  }

  findBot() {
    this.udpClient.sendBroadcast();
  }

  connect(port) {
    console.log("connect " + port);
    let socket;
    let self = this;
    if (!this.socketList.has(port)) {
      socket = new this.MyClient((port, cmd, data) =>{ self.handleSocket(port, cmd, data); });
      let socket_info = { current_cmd: -1, starttime: 0, ping: 0, socket: socket };
      this.socketList.set(port, socket_info);
    } else {
      socket = this.socketList.get(port).socket;
    }
    socket.connect("127.0.0.1", port);
  }

  isConnected(port) {
    return this.socketList.has(port);
  }

  end(port) {
    let socket = this.socketList.get(port).socket;
    socket.end();
  }

  send(port, cmd, data) {
    console.log("send "+port+": "+cmd)
    console.log(data)
    let socket_info = this.socketList.get(port);
    let socket = socket_info.socket;
    if (socket) {
      socket.send(cmd, data);
      socket_info.current_cmd = cmd;
      socket_info.starttime = Date.now();
      this.socketList.set(port, socket_info);
    }
  }

  robot_status_info_req(port) {
    this.send(port, 1000, null);
  }

  robot_status_run_req(port) {
    this.send(port, 1002, null);
  }

  robot_status_loc_req(port) {
    this.send(port, 1004, null);
  }

  robot_status_speed_req(port) {
    this.send(port, 1005, null);
  }

  robot_status_block_req(port) {
    this.send(port, 1006, null);
  }

  robot_status_battery_req(port, bSimple) {
    let message = null;
    if (bSimple) {
      message = { "simple": bSimple };
    }
    this.send(port, 1007, JSON.stringify(message));
  }

  robot_status_laser_req(port) {
    this.send(port, 1009, null);
  }

  robot_status_path_req(port) {
    this.send(port, 1010, null);
  }

  robot_status_area_req(port) {
    this.send(port, 1011, null);
  }

  robot_status_emergency_req(port) {
    this.send(port, 1012, null);
  }

  robot_status_io_req(port) {
    this.send(port, 1013, null);
  }

  robot_status_imu_req(port) {
    this.send(port, 1014, null);
  }

  robot_status_rfid_req(port) {
    this.send(port, 1015, null);
  }

  robot_status_ultrasonic_req(port) {
    this.send(port, 1016, null);
  }

  robot_status_pgv_req(port) {
    this.send(port, 1017, null);
  }

  robot_status_encoder_req(port) {
    this.send(port, 1018, null);
  }

  robot_status_task_req(port, bSimple) {
    let message = null;
    if (bSimple) {
      message = { "simple": bSimple };
    }
    this.send(port, 1020, JSON.stringify(message));
  }

  robot_status_reloc_req(port) {
    this.send(port, 1021, null);
  }

  robot_status_loadmap_req(port) {
    this.send(port, 1022, null);
  }

  robot_status_slam_req(port) {
    this.send(port, 1025, null);
  }

  robot_status_slam_map_req(port) {
    this.send(port, 1026, null);
  }

  robot_status_jack_req(port) {
    this.send(port, 1027, null);
  }

  robot_status_dispatch_req(port) {
    this.send(port, 1030, null);
  }

  robot_status_motor_req(port, motor_array) {
    let message = null;
    if (motor_array != null) {
      message = { "motor_names": [motor_array.toString()] }
    }
    this.send(port, 1040, JSON.stringify(message));
  }

  robot_status_alarm_req(port) {
    this.send(port, 1050, null);
  }

  robot_status_current_lock_req(port) {
    this.send(port, 1060, null);
  }

  robot_status_all1_req(port, keys_array, bReqLaser) {
    let message = null;
    if (keys_array != null) {
      message = { "keys": [keys_array.toString()], "return_laser": bReqLaser };
    } else {
      message = { "return_laser": bReqLaser };
    }
    this.send(port, 1100, JSON.stringify(message));
  }

  robot_status_all2_req(port, bReqLaser) {
    let message = null;
    if (!bReqLaser) {
      message = { "return_laser": bReqLaser };
    }
    this.send(port, 1101, JSON.stringify(message));
  }

  robot_status_all3_req(port) {
    this.send(port, 1102, null);
  }

  robot_status_task_status_package_req(port, task_array) {
    let message = null;
    if (task_array != null) {
      message = { "task_ids": [task_array.toString()] }
    }
    this.send(port, 1110, JSON.stringify(message));
  }

  robot_status_map_req(port) {
    this.send(port, 1300, null);
  }

  robot_status_station_req(port) {
    this.send(port, 1301, null);
  }

  robot_control_stop_req(port) {
    this.send(port, 2000, null);
  }

  robot_control_reloc_req(port, x, y, angle) {
    let message = { 'x': x, 'y': y, 'angle': angle };
    this.send(port, 2002, JSON.stringify(message));
  }

  robot_control_comfirmloc_req(port) {
    this.send(port, 2003, null);
  }

  robot_control_cancelreloc_req(port) {
    this.send(port, 2004, null);
  }

  robot_control_motion_req(port, vx, vy, w, steer, real_steer, duration) {
    console.log('robot_control_motion_req port=' + port + ', vx=' + vx + ', w=' + w)
    let message = { "vx": vx, "vy": vy, "w": w, "steer": steer, "real_steer": real_steer, "duration": duration };
    this.send(port, 2010, JSON.stringify(message));
  }

  robot_control_loadmap_req(port, map_name) {
    let message = { "map_name": map_name };
    this.send(port, 2022, JSON.stringify(message));
  }

  robot_task_pause_req(port) {
    let message = { "dispatch": true };
    this.send(port, 3001, JSON.stringify(message));
  }

  robot_task_resume_req(port) {
    let message = { "dispatch": true };
    this.send(port, 3002, JSON.stringify(message));
  }

  robot_task_cancel_req(port) {
    let message = { "dispatch": true };
    this.send(port, 3003, JSON.stringify(message));
  }

  robot_task_gotarget_req(port, nav_data) {
    this.send(port, 3051, JSON.stringify(nav_data));
  }

  robot_task_target_path_req(port, id) {
    let message = { "id": id };
    this.send(port, 3053, JSON.stringify(message));
  }

  robot_task_gotargetlist_req(port, data) {
    this.send(port, 3066, JSON.stringify(data));
  }

  robot_task_cleartargetlist_req(port) {
    this.send(port, 3067, null);
  }

  robot_task_updatetargetlist_req(port, data) {
    this.send(port, 3068, JSON.stringify(data));
  }

  robot_config_require_req(port) {
    this.send(port, 4001, null);
  }

  robot_config_release_req(port) {
    this.send(port, 4002, null);
  }

  robot_config_clearallerrors_req(port) {
    this.send(port, 4009, null);
  }

  robot_config_uploadmap_req(port, map_data) {
    this.send(port, 4010, JSON.stringify(map_data));
  }

  robot_config_downloadmap_req(port, map_name) {
    let message = { "map_name": map_name };
    this.send(port, 4011, JSON.stringify(message));
  }

  robot_config_removemap_req(port, map_name) {
    let message = { "map_name": map_name };
    this.send(port, 4012, JSON.stringify(message));
  }

  robot_config_uploadmodel_req(port, model_data) {
    this.send(port, 4020, JSON.stringify(model_data));
  }

  robot_config_downloadmodel_req(port, model_name) {
    let message = { "model_name": model_name };
    this.send(port, 4021, JSON.stringify(message));
  }

  robot_config_push_req(port, interval) {
    let message = { "interval": interval };
    this.send(port, 4091, JSON.stringify(message));
  }

  robot_config_DI_req(port, id, valid) {
    let message = { "id": id, "valid": valid };
    this.send(port, 4140, JSON.stringify(message));
  }

  robot_config_motor_clear_fault_req(port, motor_name) {
    let message = { "motor_name": motor_name };
    this.send(port, 4151, JSON.stringify(message));
  }

  robot_other_speaker_req(port, name, loop) {
    let message = { "name": name, "loop": loop };
    this.send(port, 6000, JSON.stringify(message));
  }

  robot_other_setdo_req(port, id, status) {
    let message = { "id": id, "status": status };
    this.send(port, 6001, JSON.stringify(message));
  }

  robot_other_setdos_req(port, status_data_array) {
    this.send(port, 6002, JSON.stringify(status_data_array));
  }

  robot_other_pause_audio_req(port) {
    this.send(port, 6010, null);
  }

  robot_other_resume_audio_req(port) {
    this.send(port, 6011, null);
  }

  robot_other_stop_audio_req(port) {
    this.send(port, 6012, null);
  }

  robot_other_audio_list_req(port) {
    this.send(port, 6033, null);
  }

  robot_other_jack_set_height_req(port, height) {
    let message = { "height": height };
    this.send(port, 6073, null);
  }

  robot_other_slam_req(port) {
    this.send(port, 6100, null);
  }

  robot_other_endslam_req(port, map_name) {
    let message = { "map_name": map_name };
    this.send(port, 6101, JSON.stringify(message));
  }

  robot_other_cancelslam_req(port) {
    this.send(port, 6102, null);
  }

}

//export default MySocketHelper;
module.exports = MySocketHelper;







