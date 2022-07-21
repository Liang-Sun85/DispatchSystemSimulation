const {logger} = require('../utils/MyLogger');

class PathResource {
  constructor(smap) {
    this.resourceSet = new Map();
    this.blocks = [];
    if(smap.blocks) {
      this.blocks = smap.blocks;
    }
    smap.advancedCurveList.forEach(path => {
      let block_id = -1;
      for (let i = 0; i < this.blocks.length; i++) {
        let block = this.blocks[i];
        for (let j = 0; j < block.length; j++) {
          if (block[j] == path.instanceName) {
            block_id = i;
          }
        }
      }
      this.resourceSet.set(path.instanceName, {instanceName:path.instanceName, start: path.startPos.instanceName, end: path.endPos.instanceName, flow: [], block_id: block_id });
    });
    console.log(this.blocks);
    console.log(this.resourceSet);
  }

  /*isInFlow(vehicle_id, pathName) {
    let resource = this.resourceSet.get(pathName);
    if (resource) {
      for(let i=0; i<resource.path.length; i++){
        if(vehicle_id == resource.path[i]) {
          return true;
        }
      }
    }
    return false;
  }*/

  requireResource(vehicle_id, pathName) {
    logger.info('The current require path is ' + pathName);
    let resource = this.resourceSet.get(pathName);
    logger.info(resource.flow);
    if (resource) {
      let bInFlow = false;
      for (let i = 0; i < resource.flow.length; i++) {
        if (vehicle_id == resource.flow[i]) {
          bInFlow = true;
          break;
        }
      }
      if (!bInFlow) {
        //resource.flow.push(vehicle_id);
        this.addFlow(vehicle_id, resource);
        this.addReverseFlow(vehicle_id, resource);
        this.addBlockFlow(vehicle_id, resource);
      }
      logger.info(resource.flow);
      if (resource.flow[0] == vehicle_id) {
        logger.info(pathName + ' currently is available for Vehicle ' + vehicle_id);
        this.addRelatedFlow(vehicle_id, resource.end);
        return true;
      }
    }
    logger.info(pathName + ' currently is not available for Vehicle ' + vehicle_id);
    return false;
  }

  addReverseFlow(vehicle_id, resource) {
    let pathName = resource.end + '-' + resource.start;
    let reverse = this.resourceSet.get(pathName);
    if (reverse) {
      //reverse.flow.push(vehicle_id);
      this.addFlow(vehicle_id, reverse);
    }
  }

  addBlockFlow(vehicle_id, resource) {
    if (resource.block_id != -1) {
      logger.info('Current require path belongs to a Block domain.');
      this.blocks[resource.block_id].forEach((pathName) => {
        let blockRes = this.resourceSet.get(pathName);
        //blockRes.flow.push(vehicle_id);
        this.addFlow(vehicle_id, blockRes);
      });
    }
  }

  addRelatedFlow(vehicle_id, endPoint) {
    this.resourceSet.forEach((resource) => {
      if (resource.end == endPoint) {
        //resource.flow.push[vehicle_id];
        this.addFlow(vehicle_id, resource);
      }
    });
  }

  releaseRelatedFlow(vehicle_id, step) {
    logger.info('Dispatch system try to release the traffic resource.');
    this.resourceSet.forEach((resource, pathName) => {
      if (pathName == step.path) {
        return;
      }
      let step_reverse = step.end + '-' + step.start;
      if (pathName == step_reverse) {
        return;
      }

      if (resource.end == step.start || resource.start == step.start) {
        if (resource.block_id != -1) {
          let block = this.blocks[resource.block_id];
          let release = true;
          for(let i=0;i<block.length;i++){
            if(step.path == block[i]) { // new step in same block
              release = false;
            }
          }
          if (release) {
            for(let i=0;i<block.length;i++){
              let blockRes = this.resourceSet.get(block[i]);
              this.releaseFlow(vehicle_id, blockRes);
            }
          }
        } else {
          this.releaseFlow(vehicle_id, resource);
        }
      }
    });
  }

  addFlow(vehicle_id, resource){
    for (let i = 0; i < resource.flow.length; i++) {
      if (vehicle_id == resource.flow[i]) {
        return;
      }
    }
    resource.flow.push(vehicle_id);
  }

  releaseFlow(vehicle_id, resource) {
    for (let i = 0; i < resource.flow.length; i++) {
      if (vehicle_id == resource.flow[i]) {
        resource.flow.splice(i, 1);
        return;
      }
    }
  }

  releaseVehicleFlow(vehicle_id) {
    this.resourceSet.forEach((resource) => {
      for (let i = 0; i < resource.flow.length; i++) {
        if (vehicle_id == resource.flow[i]) {
          resource.flow.splice(i, 1);
        }
      }
    });
  }

  getFlows() {
    let flows = [];
    this.resourceSet.forEach((resource) => {
      flows.push(resource);
    });
    return flows;
  }
}

module.exports = PathResource;