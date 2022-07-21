const {logger} = require('../utils/MyLogger');

class Vehicle{
    constructor(id, socketHelper){
        this.socketHelper = socketHelper;
        this.status = {};
        this.status.id = id;
        this.status.status = 'offline';
        this.status.current_station = '';
    }

    connect(){
        this.socketHelper.connect(this.status.port);
        setTimeout(()=>{this.socketHelper.robot_status_loc_req(this.status.port)},1000);
    }

    getId() {
        return this.status.id;
    }

    getPort() {
        return this.status.port;
    }

    getCurrent_station() {
        return this.status.current_station;
    }

    getLast_station() {
        return this.status.last_station;
    }

    getVehicle_id() {
        return this.status.vehicle_id;
    }

    getStatus() {
        return this.status;
    }

    getPosition() {
        let position = {x:this.status.x, y:this.status.y, angle:this.status.angle};
        return position;
    }

    getBattery_level() {
        return this.status.battery_level;
    }

    getTask_status() {
        return this.status.task_status;
    }
    
    reqStatus() {
        this.socketHelper.robot_status_info_req(this.status.port);
    }

    setOrderCallback(orderCallback) {
        this.orderCallback = orderCallback;
    }

    setStatus(statusObject) {
        Object.assign(this.status, statusObject);
    }

    getNetStatus() {
        return this.status.status;
    }

    setNetStatus(status) {
        this.status.status = status;
    }

    sendTargetList(list,task_id) {
        let message = {"stations":list, "task_id":task_id};
        this.socketHelper.robot_task_gotargetlist_req(this.status.port, message);
    }

    updateTargetList(source_id, id, valid1, valid2, action) {
        let message = {"source_id":source_id, "id":id, "valid":valid1, "parking_mark": valid2};
        if (action) {
            Object.assign(message, action);  
        }
        console.log(message);
        console.log(this.status.id);
        this.socketHelper.robot_task_updatetargetlist_req(this.status.port, message);
    }

    goNextStep(message){
        this.socketHelper.robot_task_updatetargetlist_req(this.status.port, message);
    }

    pauseTask() {
        logger.info('pause...');
        this.socketHelper.robot_task_pause_req(this.status.port);
    }

    resumeTask() {
        logger.info('resume...');
        this.socketHelper.robot_task_resume_req(this.status.port);
    }

    cancelTask() {
        logger.info('The current order has been withdraw.');
        this.socketHelper.robot_task_cancel_req(this.status.port);
    }

    handleSocket(ping, cmd, data) {
        this.status.ping = ping;
        switch(cmd) {
            case 11000:{
                Object.assign(this.status, data);
                console.log(this.status);
                break;
            }
            case 11004:{
                /*if(data.current_station && this.status.current_station && data.current_station != this.status.current_station && this.orderCallback) {
                    this.orderCallback({cmd:'current_station_change', param: {old:this.status.current_station, new:data.current_station}});
                }*/
                Object.assign(this.status, data);
                //setTimeout(()=>{this.socketHelper.robot_status_loc_req(this.status.port)},1000);
                break;
            }
            case 19301:{
                /*if(data.current_station && this.status.current_station && data.current_station != this.status.current_station && this.orderCallback) {
                    this.orderCallback({cmd:'current_station_change', param: {old:this.status.current_station, new:data.current_station}});
                }*/
                Object.assign(this.status, data);
                console.log('current:'+this.status.current_station+', last:'+this.status.last_station+', task_status:'+this.status.task_status);
                break;
            }
            case 13066:
            case 13068:{
                console.log(cmd);
                console.log(data);
                break;
            }
            default:
                Object.assign(this.status, data);
                break;
        }
    }
}

//export default MyUdpClient;
module.exports = Vehicle;