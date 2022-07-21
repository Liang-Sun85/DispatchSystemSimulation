# -*- coding: UTF-8 -*-

import socket
from threading import Thread, Timer
import json
import struct
import math

class agv:
    __VEHICLE_ID_PREFIX = 'chagv_'
    __header = 90;
    __version = 1;
    __reserved = bytes().fromhex('000000000000')
    __speed = 0.3
    #__reserved = '000000000000'.decode('hex')

    def __init__(self, id, port, current_map, advancedPointList):
        self.__ClientList = []
        self.__bPushing = False
        self.__running = True
        self.__onRecv = False

        self.id = id
        self.advancedPointList = advancedPointList
        self.vehicle_id = self.__VEHICLE_ID_PREFIX + id
        self.current_map = current_map
        self.current_station = "PP1"
        self.last_station = "null"
        self.task_status = 0
        pos = self.__getSationPos(self.current_station)
        self.x = pos['x']
        self.y = pos['y']
        self.angle = pos['angle']
        self.vx = 0
        self.vy = 0
        self.w = 0
        self.steer = 0
        self.battery_level = 0.9
        self.blocked = False
        self.charging = False
        self.emergency = False
        self.brake = False
        self.soft_emc = False
        self.block_reason = 0
        self.confidence = 1
        self.port = port
        self.current_ip = port
        self.__moving = False
        self.cancle_task = False
        print(self.id)
        print(self.vehicle_id)
        self.__start(port)

    def __getSationPos(self, stationName):
        for station in self.advancedPointList:
            if (stationName == station['instanceName']):
                pos = station['pos']
                if('dir' in station.keys()):
                    pos['angle'] = station['dir']
                else :
                    pos['angle'] = 0
                return pos
    
    def __getStationType(self, stationName):
        for station in self.advancedPointList:
            if (stationName == station['instanceName']):
                return station['className']

    def __start(self, port):
        try:
            self.__s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.__s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.__s.bind(('0.0.0.0', port))
            self.__s.listen(2)
            self.__s.settimeout(86400)

        except socket.error as msg:
            print('socket.error: '+str(msg))

        tTcp = Thread(target=self.__TcpHandler)
        tTcp.setDaemon(True)
        tTcp.start()

    def __startPush(self):
        self.__bPushing = True

        if len(self.__ClientList) == 0:
            self.__bPushing = False
            print('no client, quit')
            return
        if not self.__onRecv:
            #key_list = ['current_station', 'last_station', 'current_map', 'vehicle_id', 'task_status','x', 'y', 'angle', 'vx', 'vy', 'w', 'steer', 'battery_level', 'blocked', 'charging', 'emergency', 'brake', 'soft_emc','block_reason','confidence']
            #type_list = ['s','s','s','s','i','f','f','f','f','f','f','f','f','b','b','b','b','b','i','f']
            #send_data = self.__getRedisData(key_list, type_list)
            send_data = {"current_station": self.current_station, "last_station":self.last_station, "current_map":self.current_map,
                "vehicle_id":self.vehicle_id, "task_status":self.task_status, "x":self.x, "y":self.y, "angle":self.angle, 
                "vx":self.vx, "vy":self.vy, "w":self.w, "steer":self.steer, "battery_level":self.battery_level, "blocked":self.blocked,
                "charging":self.charging, "emergency":self.emergency, "brake":self.brake, "soft_emc":self.soft_emc,
                "block_reason":self.block_reason,"confidence":self.confidence}
            for client in self.__ClientList:
                self.send(client, 19301, send_data)
        
        Timer(1, self.__startPush).start()

    def __TcpHandler(self):

        while self.__running:
            try:
                print(self.vehicle_id + ' start listen')
                client, addr = self.__s.accept()
                print(self.vehicle_id + ' connect')
                client.settimeout(86400)
                self.__ClientList.append(client)
                print(self.__ClientList)
                if len(self.__ClientList) == 1:
                    Timer(1, self.__startPush).start()
                t = Thread(target=self.__messageHandler, args=(client,))
                t.setDaemon(True)
                t.start()
            except Exception as msg:
                print('__TcpHandler Exception: '+str(msg))
                break
        self.__running = False
        self.__del__()
        print("__TcpHandler exit")

    def send(self, client, cmd, content):
        data_content = json.dumps(content, separators=(',', ':')).encode()
        length = len(data_content)
        #print(length)
        data = struct.pack('!BBHIH6s', 90, 1, 1, length, cmd, self.__reserved)
        data += data_content
        client.sendall(data)
    
    def __messageHandler(self, client):
        while self.__running:
            try:
                buf = client.recv(16)
                if len(buf) == 16:
                    self.__onRecv = True
                    header, ver, number, length, cmd, reserved = struct.unpack('!BBHIH6s', buf)
                    print("header="+str(header)+", ver="+str(ver)+", number="+str(number)+", length="+str(length)+", cmd="+str(cmd))
                    if header == 90 and length > 0:
                        data = b''
                        if length < 1024:
                            data = client.recv(length)
                        else:
                            recved_length = 0
                            while recved_length < length:
                                recv_data = client.recv(1024)
                                data += recv_data
                                recved_length += len(recv_data)

                        #print(data)
                        print(data.decode())
                        self.__commandHandler(cmd, data, client)
                    else:
                        self.__commandHandler(cmd, '', client)
                    self.__onRecv = False
                else:
                    print("Connection off")
                    self.__ClientList.remove(client)
                    # self.__BotDisconnect(client)
                    break
            #except ConnectionResetError:
                #print("ConnectionResetError")
                # self.__BotDisconnect(client)
                #break
            except Exception as msg:
                print('messageHandler Exception: '+str(msg))
                self.__ClientList.remove(client)
                break
        print("recv thread exit")

    def __commandHandler(self, cmd, data, client):
        if cmd == 1000:
            #key_list = ['id', 'vehicle_id', 'current_ip', 'robot_note', 'version', 'model', 'current_map', 'current_map_md5',  'ssid', 'rssi', 'MAC']
            #type_list = ['s','s','s','s','s','s','s','s','s','s','s']
            #send_data = self.__getRedisData(key_list, type_list)
            send_data = {'id':self.id, 'vehicle_id':self.vehicle_id, 'port':self.port, 'current_map':self.current_map}
            self.send(client, cmd+10000, send_data)
        elif cmd == 1004:
            #key_list = ['x', 'y', 'angle', 'confidence', 'current_station', 'last_station']
            #type_list = ['f','f','f','f','s','s']
            #send_data = self.__getRedisData(key_list, type_list)
            send_data = {'x':self.x, 'y':self.y, 'angle':self.angle, 'confidence':self.confidence, 'current_station':self.current_station, 'last_station':self.last_station}
            self.send(client, cmd+10000, send_data)
        elif cmd == 1005:
            #key_list = ['vx', 'vy', 'w']
            #type_list = ['f','f','f']
            #send_data = self.__getRedisData(key_list, type_list)
            send_data = {'vx':self.vx, 'vy':self.vy, 'w':self.w}
            self.send(client, cmd+10000, send_data)
        elif cmd == 1006:
            #key_list = ['blocked', 'block_reason']
            #type_list = ['b','s']
            #send_data = self.__getRedisData(key_list, type_list)
            send_data = {'blocked':self.blocked, 'block_reason':self.block_reason}
            self.send(client, cmd+10000, send_data)
        elif cmd == 1020:
            #key_list = ['task_status']
            #type_list = ['i']
            #send_data = self.__getRedisData(key_list, type_list)
            send_data = {"task_status":self.task_status}
            self.send(client, cmd+10000, send_data)
        elif cmd == 3001:
            self.task_status = 3
            self.send(client, cmd+10000, {'ret_code':0})
        elif cmd == 3002:
            self.task_status = 2
            self.send(client, cmd+10000, {'ret_code':0})
        elif cmd == 3003:
            self.cancle_task = True
            self.send(client, cmd+10000, {'ret_code':0})
        elif cmd == 3066:
            station_list = json.loads(data.decode())
            self.__sourceStation = station_list['stations'][0]
            self.__destStation = station_list['stations'][1]
            self.__startNav(self.__sourceStation, self.__destStation, None)
            self.send(client, cmd+10000, {'ret_code':0})
        elif cmd == 3068:
            msg = json.loads(data.decode())
            self.parking_mark = msg['parking_mark']
            if(msg['source_id'] == self.__destStation):
                self.__nextStation = msg['id']
            
        else:
            self.send(client, cmd+10000, {'ret_code':0})

    def end(self):
        print('end')
        self.__s.close()

    def getParam(self, param):
        return getattr(self, param)

    def setParam(self, param, value):
        setattr(self, param, value)

    def setCurrentStation(self, value):
        setattr(self, 'current_station', value)
        pos = self.__getSationPos(value)
        self.x = pos['x']
        self.y = pos['y']
        self.angle = pos['angle']

    def __startNav(self, start, end, operation):
        self.__destPos = self.__getSationPos(end)
        self.task_status = 2
        Timer(1, self.__move, args=(True,)).start()
        

    def __move(self, bMove):
        self.__moving = bMove
        if bMove:
            if self.task_status == 2:
                X = self.__destPos['x'] - self.x
                Y = self.__destPos['y'] - self.y
                if(X == 0):
                    if(Y>0):
                        if (Y<self.__speed):
                            self.y = self.__destPos['y']
                            self.__sourceStation = self.__destStation
                            self.__destStation = self.__nextStation
                            self.__destPos = self.__getSationPos(self.__destStation)
                        else :
                            self.y += self.__speed
                    elif(Y<0):
                        if(Y>-self.__speed):
                            self.y = self.__destPos['y']
                            self.__sourceStation = self.__destStation
                            self.__destStation = self.__nextStation
                            self.__destPos = self.__getSationPos(self.__destStation)
                        else:
                            self.y -= self.__speed
                elif(Y == 0):
                    if(X>0):
                        if (X<self.__speed):
                            self.x = self.__destPos['x']
                            self.__sourceStation = self.__destStation
                            self.__destStation = self.__nextStation
                            self.__destPos = self.__getSationPos(self.__destStation)
                        else :
                            self.x += self.__speed
                    elif(X<0):
                        if(X>-self.__speed):
                            self.x = self.__destPos['x']
                            self.__sourceStation = self.__destStation
                            self.__destStation = self.__nextStation
                            self.__destPos = self.__getSationPos(self.__destStation)
                        else:
                            self.x -= self.__speed
                else:
                    print('has angle')

                source_pos = self.__getSationPos(self.__sourceStation)
                dest_pos = self.__getSationPos(self.__destStation)
                distance_source = self.__distance(self.x, self.y, source_pos['x'], source_pos['y'])
                distance_dest = self.__distance(self.x, self.y, dest_pos['x'], dest_pos['y'])

                if(distance_source > 0.5):
                    self.last_station = self.__sourceStation
                    self.current_station = "null"
                if(distance_dest < 0.5):
                    self.current_station = self.__destStation

                if(distance_dest == 0):
                    if self.cancle_task == True:
                        self.task_status = 0
                        self.cancle_task = False
                    else :
                        dest_station_type = self.__getStationType(self.__destStation)
                        if(dest_station_type == 'ActionPoint' or dest_station_type == 'ParkPoint' or dest_station_type == 'ChargePoint'):
                            if(self.parking_mark):
                                self.task_status = 0
                            else:
                                self.task_status = 4
                            self.__moving = False
                            return

            Timer(1, self.__move, args=(True,)).start()

    def __distance(self, x1, y1, x2, y2):
        return ((x2-x1)**2+(y2-y1)**2)**0.5

    def __del__(self):
        print('__del__')
        #self.__s.shutdown(socket.SHUT_RDWR)
        self.__s.close()