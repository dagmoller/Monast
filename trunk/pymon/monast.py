#!/usr/bin/python -u

import re
import sys
import time
import pprint
import socket
import random
import thread
import threading
import traceback
import Queue
import log
from ConfigParser import SafeConfigParser

rePeerEntry   = re.compile('Event: PeerEntry|Channeltype: ([^\r^\n^\s]*)|ObjectName: ([^\r^\n^\s]*)|IPaddress: ([^\r^\n^\s]*)|IPport: ([^\r^\n^\s]*)|Status: ([^\r^\n]*)')
rePeerStatus  = re.compile('Event: PeerStatus|Peer: ([^\r^\n^\s]*)|PeerStatus: ([^\r^\n^\s]*)')
reNewChannel  = re.compile('Event: Newchannel|Channel: ([^\r^\n^\s]*)|State: ([^\r^\n^\s]*)|CallerIDNum: ([^\r^\n^\s]*)|CallerIDName: ([^\r^\n]*)|Uniqueid: ([^\r^\n^\s]*)')
reHangup      = re.compile('Event: Hangup|Channel: ([^\r^\n^\s]*)|Uniqueid: ([^\r^\n^\s]*)|Cause: ([^\r^\n^\s]*)|Cause-txt: ([^\r^\n]*)')
reNewState    = re.compile('Event: Newstate|Channel: ([^\r^\n^\s]*)|State: ([^\r^\n^\s]*)|CallerID: ([^\r^\n^\s]*)|CallerIDName: ([^\r^\n^]*)|Uniqueid: ([^\r^\n^\s]*)')
reDial        = re.compile('Event: Dial|Source: ([^\r^\n^\s]*)|Destination: ([^\r^\n^\s]*)|CallerID: ([^\r^\n^\s]*)|CallerIDName: ([^\r^\n]*)|SrcUniqueID: ([^\r^\n^\s]*)|DestUniqueID: ([^\r^\n^\s]*)')
reLink        = re.compile('Event: Link|Channel1: ([^\r^\n^\s]*)|Channel2: ([^\r^\n^\s]*)|Uniqueid1: ([^\r^\n^\s]*)|Uniqueid2: ([^\r^\n^\s]*)|CallerID1: ([^\r^\n^\s]*)|CallerID2: ([^\r^\n^\s]*)')
reUnlink      = re.compile('Event: Unlink|Channel1: ([^\r^\n^\s]*)|Channel2: ([^\r^\n^\s]*)|Uniqueid1: ([^\r^\n^\s]*)|Uniqueid2: ([^\r^\n^\s]*)|CallerID1: ([^\r^\n^\s]*)|CallerID2: ([^\r^\n^\s]*)')
reNewcallerid = re.compile('Event: Newcallerid|Channel: ([^\r^\n^\s]*)|CallerID: ([^\r^\n^\s]*)|CallerIDName: ([^\r^\n]*)|Uniqueid: ([^\r^\n^\s]*)|CID-CallingPres: ([^\r^\n]*)')

def merge(l):
	out = [None for x in l[0]]
	for t in l:
		for i in range(len(t)):
			if t[i]:
				out[i] = t[i]
	return out

class MyConfigParser(SafeConfigParser):
    def optionxform(self, optionstr):
        return optionstr

class AstMon():

	HOSTNAME = None
	HOSTPORT = None
	USERNAME = None
	PASSWORD = None
	
	userDisplay = {} 
	
	socketAMI = None
	queueAMI  = Queue.Queue()
	
	connected = False
	run       = True
	
	pingResp  = True
	pingLimit = 60
	
	tRead = None
	tPing = None
	
	socketClient = None
	clientSocks  = {}
	clientQueues = {}
	
	clientSockLock  = threading.RLock()
	clientQueuelock = threading.RLock() 
	
	monitoredUsers     = {}
	monitoredUsersLock = threading.RLock()
	
	channels     = {}
	channelsLock = threading.RLock()
	
	calls     = {}
	callsLock = threading.RLock()
	
	configFiles = ['sip.conf', 'iax.conf']
	
	def send(self, lines):
		if self.connected:
			try:
				self.socketAMI.send('%s\r\n\r\n' % '\r\n'.join(lines))
			except socket.error, e:
				log.error('Erro enviando dados pelo socket: %e' % e)
	
	def ping(self, a, b):
		log.info('Iniciando Thread ping')
		t = 0
		while self.run:
			time.sleep(1)
			if t >= self.pingLimit and self.connected:
				if self.pingResp:
					log.info('Enviando PING')
					t = 0
					self.pingResp = False
					self.send(['Action: ping'])
				else:
					log.error('sem resposta apos %d segundos' % self.pingLimit)
					self.connected = False
					self.pingResp  = True
					self.close()
					
			t += 1
	
	def read(self, a, b):
		log.info('Iniciando Thread read')
		msg = ''
		while self.run:
			try:
				msg += self.socketAMI.recv(1024 * 16)
				if msg.endswith('\r\n\r\n'):
					self.parse(msg)
					msg = ''
			except socket.error, e:
				log.error('Erro lendo socket: %s' % e)
			except:
				log.error('\n' + traceback.format_exc())
	
	def connect(self):
		while not self.connected:
			try:
				log.info('Conectando a %s:%d' % (self.HOSTNAME, self.HOSTPORT))
				self.socketAMI = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
				self.socketAMI.connect((self.HOSTNAME, self.HOSTPORT))
				self.connected = True
				self.login()
			except socket.error, e:
				log.error('Erro conectando a %s:%d -- %s' % (self.HOSTNAME, self.HOSTPORT, e))
				time.sleep(30)
		
		for conf in self.configFiles:
			self.send(['Action: GetConfig', 'Filename: %s' % conf])
		
		if not self.tRead:
			self.tRead = thread.start_new_thread(self.read, ('read', 2))
			self.tPing = thread.start_new_thread(self.ping, ('ping', 2))
			
		self.send(['Action: SIPPeers'])
		self.send(['Action: IAXPeers'])
	
	def close(self):
		log.info('Fechando socket')
		try:
			self.socketAMI.shutdown(socket.SHUT_RDWR)
			self.socketAMI.close()
		except socket.error, e:
			log.error('Erro fechando socket: %s' % e)
	
	def login(self):
		log.info('Efetuando login')
		self.send(['Action: login', 'Username: %s' % self.USERNAME, 'Secret: %s' % self.PASSWORD])
		
	def logoff(self):
		log.info('Efetuando logoff')
		self.send(['Action: logoff'])
	
	def parse(self, msg):
		msg = msg.strip()
		if msg:
			enqueue = []
			blocks  = msg.split('\r\n\r\n')
			for block in blocks:
				if block == 'Response: Pong':
					log.info('Recebido PONG')
					self.pingResp = True
					continue
				
				log.show(block)
				
				if block.startswith('Response: Success\r\nCategory-'):
					self.parseConfig(block.replace('Response: Success\r\n', ''), self.configFiles.pop(0))
				
				if block.startswith('Event: PeerEntry\r\n'):
					Channeltype, ObjectName, IPaddress, IPport, Status = merge(rePeerEntry.findall(block))
					
					log.info('Evento PeerEntry detectado para: %s' % ObjectName)
					
					if Status.startswith('OK'):
						Status = 'Registered'
					elif Status.find('(') != -1:
						Status = Status[0:Status.find('(')]
					
					self.monitoredUsersLock.acquire()
					user = '%s/%s' % (Channeltype, ObjectName)
					if self.monitoredUsers.has_key(user):
						self.monitoredUsers[user]['Status'] = Status
					self.monitoredUsersLock.release()
					
				if block.startswith('Event: PeerStatus\r\n'):
					Peer, PeerStatus = merge(rePeerStatus.findall(block))
					
					log.info('Evento PeerStatus detectado para: %s' % Peer)
					
					self.monitoredUsersLock.acquire()
					if self.monitoredUsers.has_key(Peer):
						mu = self.monitoredUsers[Peer]
						mu['Status'] = PeerStatus
						enqueue.append('PeerStatus: %s:::%s:::%s' % (Peer, mu['Status'], mu['Calls']))
					self.monitoredUsersLock.release()
				
				if block.startswith('Event: Newchannel\r\n'):
					Channel, State, CallerIDNum, CallerIDName, Uniqueid = merge(reNewChannel.findall(block))
					
					log.info('Evento NewChannel detectado')
					
					self.channelsLock.acquire()
					self.channels[Uniqueid] = {'Channel': Channel, 'State': State, 'CallerIDNum': CallerIDNum, 'CallerIDName': CallerIDName}
					self.channelsLock.release()
					
					self.monitoredUsersLock.acquire()
					user = Channel[:Channel.rfind('-')]
					if self.monitoredUsers.has_key(user):
						self.monitoredUsers[user]['Calls'] += 1
						enqueue.append('PeerStatus: %s:::%s:::%s' % (user, self.monitoredUsers[user]['Status'], self.monitoredUsers[user]['Calls']))
					self.monitoredUsersLock.release()
					
					enqueue.append('NewChannel: %s:::%s:::%s:::%s:::%s' % (Channel, State, CallerIDNum, CallerIDName, Uniqueid))
				
				if block.startswith('Event: Newstate\r\n'):
					Channel, State, CallerID, CallerIDName, Uniqueid = merge(reNewState.findall(block))
					
					log.info('Evento NewState detectado')
					
					self.channelsLock.acquire()
					try:
						self.channels[Uniqueid]['State'] = State
						enqueue.append('NewState: %s:::%s:::%s:::%s:::%s' % (Channel, State, CallerID, CallerIDName, Uniqueid))
					except:
						pass
					self.channelsLock.release()
				
				if block.startswith('Event: Hangup\r\n'):
					Channel, Uniqueid, Cause, Cause_txt = merge(reHangup.findall(block))
					
					log.info('Evento Hangup detectado')
					
					self.channelsLock.acquire()
					try:
						del self.channels[Uniqueid]
						enqueue.append('Hangup: %s:::%s:::%s:::%s' % (Channel, Uniqueid, Cause, Cause_txt))
					except:
						pass
					self.channelsLock.release()
					
					self.callsLock.acquire()
					toDelete = None
					for id in self.calls:
						if id.find(Uniqueid) != -1 and self.calls[id]['Status'] == 'Dial':
							toDelete = id
							break
					if toDelete:
						del self.calls[toDelete]
						src, dst = toDelete.split('-')
						enqueue.append('Unlink: FAKE:::FAKE:::%s:::%s:::FAKE:::FAKE' % (src, dst))
					self.callsLock.release()
					
					self.monitoredUsersLock.acquire()
					user = Channel[:Channel.rfind('-')]
					if self.monitoredUsers.has_key(user) and self.monitoredUsers[user]['Calls'] > 0:
						self.monitoredUsers[user]['Calls'] -= 1
						enqueue.append('PeerStatus: %s:::%s:::%s' % (user, self.monitoredUsers[user]['Status'], self.monitoredUsers[user]['Calls']))
					self.monitoredUsersLock.release()
					
				if block.startswith('Event: Dial\r\n'):
					Source, Destination, CallerID, CallerIDName, SrcUniqueID, DestUniqueID = merge(reDial.findall(block))
					
					log.info('Evento Dial detectado')
					
					self.callsLock.acquire()
					self.calls['%s-%s' % (SrcUniqueID, DestUniqueID)] = {
						'Source': Source, 'Destination': Destination, 'CallerID': CallerID, 'CallerIDName': CallerIDName, 
						'SrcUniqueID': SrcUniqueID, 'DestUniqueID': DestUniqueID, 'Status': 'Dial'
					}
					self.callsLock.release()
					
					enqueue.append('Dial: %s:::%s:::%s:::%s:::%s:::%s' % (Source, Destination, CallerID, CallerIDName, SrcUniqueID, DestUniqueID))
					
				if block.startswith('Event: Link\r\n'):
					Channel1, Channel2, Uniqueid1, Uniqueid2, CallerID1, CallerID2 = merge(reLink.findall(block))
					
					log.info('Evento Link detectado')
					
					self.callsLock.acquire()
					try:
						self.calls['%s-%s' % (Uniqueid1, Uniqueid2)]['Status'] = 'Link'
						#enqueue.append('Link: %s:::%s:::%s:::%s:::%s:::%s' % (Channel1, Channel2, Uniqueid1, Uniqueid2, CallerID1, CallerID2))
					except:
						self.calls['%s-%s' % (Uniqueid1, Uniqueid2)] = {
							'Source': Channel1, 'Destination': Channel2, 'CallerID': CallerID1, 'CallerIDName': '', 
							'SrcUniqueID': Uniqueid1, 'DestUniqueID': Uniqueid2, 'Status': 'Link'
						}
					enqueue.append('Link: %s:::%s:::%s:::%s:::%s:::%s' % (Channel1, Channel2, Uniqueid1, Uniqueid2, CallerID1, CallerID2))
					self.callsLock.release()
				
				if block.startswith('Event: Unlink\r\n'):
					Channel1, Channel2, Uniqueid1, Uniqueid2, CallerID1, CallerID2 = merge(reUnlink.findall(block))
					
					log.info('Evento Unlink detectado')
					
					self.callsLock.acquire()
					try:
						del self.calls['%s-%s' % (Uniqueid1, Uniqueid2)]
						enqueue.append('Unlink: %s:::%s:::%s:::%s:::%s:::%s' % (Channel1, Channel2, Uniqueid1, Uniqueid2, CallerID1, CallerID2))
					except:
						pass
					self.callsLock.release()
					
				if block.startswith('Event: Newcallerid\r\n'):
					Channel, CallerID, CallerIDName, Uniqueid, CIDCallingPres = merge(reNewcallerid.findall(block))
					
					log.info('Evento Newcallerid detectado')
					
					enqueue.append('NewCallerid: %s:::%s:::%s:::%s:::%s' % (Channel, CallerID, CallerIDName, Uniqueid, CIDCallingPres))
			
			self.clientQueuelock.acquire()
			for msg in enqueue:
				for session in self.clientQueues:
					self.clientQueues[session]['q'].put(msg)
			self.clientQueuelock.release()
	
	def parseConfig(self, msg, type):
		if type == 'sip.conf':
			tech = 'SIP'
		if type == 'iax.conf':
			tech = 'IAX2'
		
		lines = msg.split('\r\n')
		user  = None
		self.monitoredUsersLock.acquire()
		for line in lines:
			if line.startswith('Category-') and not line.endswith(': general') and not line.endswith(': authentication'):
				user = '%s/%s' % (tech, line[line.find(': ') + 2:]) 
				if self.userDisplay['DEFAULT'] and not self.userDisplay.has_key(user):
					self.monitoredUsers[user] = {'Channeltype': tech, 'Status': '--', 'Calls': 0, 'CallerID': '--', 'Context': 'default', 'Variables': []}
				elif not self.userDisplay['DEFAULT'] and self.userDisplay.has_key(user):
					self.monitoredUsers[user] = {'Channeltype': tech, 'Status': '--', 'Calls': 0, 'CallerID': '--', 'Context': 'default', 'Variables': []}
				else:
					user = None
				
			if user and line.startswith('Line-'):
				tmp, param = line.split(': ')
				if param.startswith('callerid'):
					self.monitoredUsers[user]['CallerID'] = param[param.find('=')+1:]
				if param.startswith('context'):
					self.monitoredUsers[user]['Context'] = param[param.find('=')+1:]
				if param.startswith('setvar'):
					self.monitoredUsers[user]['Variables'].append(param[param.find('=')+1:]) 
		self.monitoredUsersLock.release()
					
	def clientSocket(self, a, b):
		log.info('Iniciando Thread clientSocket')
		self.socketClient = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		self.socketClient.bind(('0.0.0.0', 5039))
		self.socketClient.listen(10)
		while self.run:
			try:
				(sc, addr) = self.socketClient.accept()
				log.info('Novo cliente: %s' % str(addr))
				self.clientSockLock.acquire()
				threadId  = 'clientThread-%s' % random.random()
				self.clientSocks[threadId] = thread.start_new_thread(self.clientThread, (threadId, sc, addr))
				self.clientSockLock.release()
			except:
				pass
	
	def clientThread(self, id, sock, addr):
		session = None
		log.info('Iniciando %s' % id)
		try:
			while True:
				msg = sock.recv(1024)
				if msg.strip():
					msg = msg.strip()
					log.log('Client %s: %s' % (str(addr), msg))
					self.clientQueuelock.acquire()
					if msg.upper().startswith('SESSION: '):
						session = msg[9:]
						if not self.clientQueues.has_key(session):
							self.clientQueues[session] = {'q': Queue.Queue(), 't': time.time()}
							sock.send('NEW SESSION\r\n')
						else:
							self.clientQueues[session]['t'] = time.time()
							sock.send('OK\r\n')
					elif session and msg.upper() == 'GET STATUS':
						self.clientQueues[session]['t'] = time.time()
						sock.send('BEGIN STATUS\r\n')
						self.monitoredUsersLock.acquire()
						users = self.monitoredUsers.keys()
						users.sort()
						for user in users:
							mu = self.monitoredUsers[user]
							sock.send('PeerStatus: %s:::%s:::%s\r\n' % (user, mu['Status'], mu['Calls']))
						self.monitoredUsersLock.release()
						self.channelsLock.acquire()
						for Uniqueid in self.channels:
							ch = self.channels[Uniqueid]
							sock.send('NewChannel: %s:::%s:::%s:::%s:::%s\r\n' % (ch['Channel'], ch['State'], ch['CallerIDNum'], ch['CallerIDName'], Uniqueid))
						self.channelsLock.release()
						self.callsLock.acquire()
						for call in self.calls:
							c = self.calls[call]
							sock.send('Call: %s:::%s:::%s:::%s:::%s:::%s:::%s\r\n' % (c['Source'], c['Destination'], c['CallerID'], c['CallerIDName'], \
																				c['SrcUniqueID'], c['DestUniqueID'], c['Status']))
						self.callsLock.release()
						sock.send('END STATUS\r\n')
					elif session and msg.upper() == 'GET CHANGES':
						self.clientQueues[session]['t'] = time.time()
						sock.send('BEGIN CHANGES\r\n')
						while True:
							try:
								msg = self.clientQueues[session]['q'].get(False)
								sock.send(msg + '\r\n')
							except Queue.Empty:
								break
						sock.send('END CHANGES\r\n')
					elif msg.startswith('OriginateCall'):
						self.monitoredUsersLock.acquire()
						action, src, dst = msg.split(':::')
						command = []
						command.append('Action: Originate')
						command.append('Channel: %s' % src)
						command.append('Exten: %s' % dst)
						command.append('Context: %s' % self.monitoredUsers[src]['Context'])
						command.append('Priority: 1')
						command.append('CallerID: AstMon WEB')
						for var in self.monitoredUsers[src]['Variables']:
							command.append('Variable: %s' % var)
						self.send(command)
						self.monitoredUsersLock.release()
					elif msg.startswith('OriginateDial'):
						action, src, dst = msg.split(':::')
						command = []
						command.append('Action: Originate')
						command.append('Channel: %s' % src)
						command.append('Application: Dial')
						command.append('Data: %s|30|rTt' % dst)
						command.append('CallerID: AstMon WEB')
						self.send(command)
					elif msg.startswith('HangupChannel'):
						self.channelsLock.acquire()
						action, Uniqueid = msg.split(':::')
						command = []
						command.append('Action: Hangup')
						command.append('Channel: %s' % self.channels[Uniqueid]['Channel'])
						self.send(command)
						self.channelsLock.release()
					else:
						sock.send('NO SESSION\r\n')	
					self.clientQueuelock.release()
					if msg.upper() == 'BYE':
						break
			sock.close()
		except socket.error, e:
			log.error('Socket ERROR %s: %s' % (id, e))
			for lock in (self.clientQueuelock, self.monitoredUsersLock, self.channelsLock, self.callsLock):
				try:
					lock.release()
				except:
					pass
		log.info('Encerrando %s' % id)
		self.clientSockLock.acquire()
		del self.clientSocks[id]
		self.clientSockLock.release()
	
	def clienQueueRemover(self, a, b):
		log.info('Iniciando thread clienQueueRemover')
		while self.run:
			time.sleep(60)
			self.clientQueuelock.acquire()
			dels = []
			now = time.time()
			for session in self.clientQueues:
				past = self.clientQueues[session]['t']
				if int(now - past) > 600:
					dels.append(session)
			for session in dels:
				log.info('Removendo session morta: %s' % session)
				del self.clientQueues[session]
			self.clientQueuelock.release()
			
	def start(self):
		cp = MyConfigParser()
		cp.read('monast.conf')
		
		self.HOSTNAME = cp.get('global', 'hostname')
		self.HOSTPORT = int(cp.get('global', 'hostport'))
		self.USERNAME = cp.get('global', 'username')
		self.PASSWORD = cp.get('global', 'password')	
		
		self.userDisplay['DEFAULT'] = True if cp.get('users', 'default') == 'show' else False
		
		for user, display in cp.items('users'):
			if user.startswith('SIP') or user.startswith('IAX2'): 
				if self.userDisplay['DEFAULT'] and display == 'hide':
					self.userDisplay[user] = True
				if not self.userDisplay['DEFAULT'] and display == 'show':
					self.userDisplay[user] = True
			if display == 'force':
				tech, peer = user.split('/')
				self.monitoredUsers[user] = {'Channeltype': tech, 'Status': '--', 'Calls': 0, 'CallerID': '--', 'Context': 'default'}
	
		self.cs  = thread.start_new_thread(self.clientSocket, ('clientsSocket', 2))
		self.cqr = thread.start_new_thread(self.clienQueueRemover, ('clienQueueRemover', 2))
	
		try:
			while self.run:
				time.sleep(1)
				if not self.connected:
					self.connect()
		except KeyboardInterrupt:
			self.run = False
		
		self.logoff()
		self.close()

		self.socketClient.shutdown(socket.SHUT_RDWR)
		self.socketClient.close()

if __name__ == '__main__':

	astmon = AstMon()
	astmon.start()
