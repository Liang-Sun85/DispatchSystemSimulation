#! python3
# -*- coding: UTF-8 -*-

import socket
from threading import Thread, Timer
from agv import agv
import json


mAgvItemMap = {}
mAgvPortMap = {}
mCurrentId = 0
mCurrentPort = 33000
CURRENT_MAP = "1230_1"
udp_s = {}
VEHICLE_ID_PREFIX = 'chagv_'
smap = {}

def UdpHandler():
    while True:
        try:
            data, addr = udp_s.recvfrom(1024)
            #print(data)
            j = json.loads(data.decode())
            if j['identifier'] == 'CHAIR':
                for id in mAgvPortMap.keys() :
                    send_data = {'id':id, 'vehicle_id':VEHICLE_ID_PREFIX+id, 'port':mAgvPortMap[id], 'current_map':CURRENT_MAP}
                    udp_s.sendto(json.dumps(send_data).encode(), addr)
        except Exception as msg:
            print('UdpHandler Exception: '+str(msg))
            break
    print("UdpHandler exit")


if __name__ == "__main__":
    try:
        udp_s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        udp_s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        udp_s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        udp_s.bind(('0.0.0.0', 49696))
        udp_s.settimeout(86400)
    except socket.error as msg:
        print('socket.error: '+str(msg))

    tUdp = Thread(target=UdpHandler)
    tUdp.setDaemon(True)
    tUdp.start()

    with open("./"+CURRENT_MAP+".smap",'r') as load_f:
        smap = json.load(load_f)
        del smap['normalPosList']

    while True:
        cmd = input('>')
        if (cmd == 'quit'):
            break
        elif (cmd == '+'):
            mCurrentId += 1
            mCurrentPort +=1
            id = "%03d" %mCurrentId
            mAgvItemMap[id] = agv(id, mCurrentPort, CURRENT_MAP, smap["advancedPointList"])
            mAgvPortMap[id] = mCurrentPort
            print(mAgvItemMap)
            print(mAgvPortMap)
        elif (cmd[0] == '-'):
            id = cmd[1:4]
            mAgvItemMap[id].end()
            del mAgvItemMap[id]
            del mAgvPortMap[id]
            print(mAgvItemMap)
            print(mAgvPortMap)
        elif (cmd == 'agv_list'):
            print(mAgvItemMap)
            print(mAgvPortMap)
        elif (cmd == 'station_list'):
            station_list = []
            for item in smap['advancedPointList']:
                station_list.append(item['instanceName'])
            print(station_list)
        elif (cmd == 'path_list'):
            path_list = []
            for item in smap['advancedCurveList']:
                path_list.append(item['instanceName'])
            print(path_list)
        elif (cmd[0:3] == 'set'):
            set_cmd = cmd.split(' ')
            id = set_cmd[1]
            param = set_cmd[2]
            value = set_cmd[3]
            value_in_db = mAgvItemMap[id].getParam(param)
            if isinstance(value_in_db, int):
                value = int(value)
            elif isinstance(value_in_db, float):
                value = float(value)
            elif isinstance(value_in_db, bool):
                value = bool(value)

            if(param == 'current_station'):
                mAgvItemMap[id].setCurrentStation(value)
            else:
                mAgvItemMap[id].setParam(param, value)

        elif (cmd[0:3] == 'get'):
            get_cmd = cmd.split(' ')
            id = get_cmd[1]
            param = get_cmd[2]
            print(mAgvItemMap[id].getParam(param))
