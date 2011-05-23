
/*
* Copyright (c) 2008, Diego Aguirre
* All rights reserved.
* 
* Redistribution and use in source and binary forms, with or without modification,
* are permitted provided that the following conditions are met:
* 
*     * Redistributions of source code must retain the above copyright notice, 
*       this list of conditions and the following disclaimer.
*     * Redistributions in binary form must reproduce the above copyright notice, 
*       this list of conditions and the following disclaimer in the documentation 
*       and/or other materials provided with the distribution.
*     * Neither the name of the DagMoller nor the names of its contributors
*       may be used to endorse or promote products derived from this software 
*       without specific prior written permission.
* 
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
* ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
* IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
* INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, 
* BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
* DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF 
* LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE 
* OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
* OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// Global Functions
String.prototype.trim = function() { return this.replace(/^\s*/, "").replace(/\s*$/, ""); };

// Monast
var Monast = {
	// Globals
	_contextMenu: new YAHOO.widget.Menu("ContextMenu"),
	// Colors
	getColor: function (status)
	{
		status = status.toLowerCase().trim();
		switch (status)
		{
			// RED
			case 'down':
			case 'unregistered':
			case 'unreachable':
			case 'unknown':
			case 'unavailable':
			case 'invalid':
			case 'busy':
			case 'logged out':
				return '#ffb0b0';
			
			// YELLOW	
			case 'ring':
			case 'ringing':
			case 'ring, in use':
			case 'in use':
			case 'dial':
			case 'lagged':
			case 'on hold':
				return '#ffffb0';
				
			// GREEN
			case 'up':
			case 'link':
			case 'registered':
			case 'reachable':
			case 'unmonitored':
			case 'not in use':
			case 'logged in':
			case 'no alarm':
				return '#b0ffb0';
		}
		if (status.indexOf('signal') != -1)
		{
			var level = status.replace('%', '').replace('signal: ', '');
			if (level >= 70)
				return '#b0ffb0';
			if (level >= 40 && level < 70)
				return '#ffffb0';
			if (level < 40)
				return '#ffb0b0';
	    }
		return '#dddddd';
	},
	blink: function (id, color)
	{
		if (!MONAST_BLINK_ONCHANGE)
			return;
		
		var t = 0;
		for (i = 0; i < MONAST_BLINK_COUNT; i++)
		{
			$A(["#FFFFFF", color]).each(function (c) {
				t += MONAST_BLINK_INTERVAL;
				setTimeout("if ($('" + id + "')) { $('" + id + "').style.backgroundColor = '" + c + "'; }", t);
			});
		}
	},
	
	// Users/Peers
	userspeers: new Hash(),
	processUserpeer: function (u)
	{
		u.id          = md5(u.channel);
		u.statuscolor = this.getColor(u.status);
		u.callscolor  = u.calls > 0 ? this.getColor('in use') : this.getColor('not in use');
		
		if (Object.isUndefined(this.userspeers.get(u.id))) // User does not exists
		{
			var div           = document.createElement('div');
			div.id            = u.id;
			div.className     = 'peerTable';
			div.innerHTML     = new Template($('Template::Userpeer').innerHTML).evaluate(u);
			div.oncontextmenu = function () { Monast.showUserpeerContextMenu(u.id); return false;	};
			$('fieldset-' + u.channeltype).appendChild(div);
		}
		else
		{
			$(u.id).innerHTML = new Template($('Template::Userpeer').innerHTML).evaluate(u);
			var old = this.userspeers.get(u.id);
			if (old.status != u.status)
				Monast.blink(u.id + '-statuscolor', u.statuscolor);
			if (old.calls != u.calls)
				Monast.blink(u.id + '-callscolor', u.callscolor);
		}
		
		// Drag & Drop
		var dd = new YAHOO.util.DD(u.id);
		dd.onMouseDown   = this.dd_setStartPosition;
		dd.onDragDrop    = this.dd_userPeerDrop;
		dd.onInvalidDrop = this.dd_invalidDrop;
		dd.onDragOver    = this.dd_dragOver;
		dd.onDragOut     = this.dd_dragOut;
		dd.validDrop     = ['peerTable'];
		this.dd.set(u.id, dd);
		
		this.userspeers.set(u.id, u);
	},
	dd_userPeerDrop: function (e, id)
	{
		var peer = Monast.userspeers.get(this.id);
		switch ($(id).className)
		{
			case "peerTable":
				var dst = Monast.userspeers.get(id);
				var obj = {fromcallerid: peer.callerid, fromchannel: peer.channeltype + "/" + peer.peername, tocallerid: dst.callerid, tochannel: dst.channeltype + "/" + dst.peername};
				Monast.doConfirm(
					new Template($("Template::Userpeer::Form::Originate::InternalCall").innerHTML).evaluate(obj),
					function () {
						new Ajax.Request('action.php', 
						{
							method: 'get',
							parameters: {
								reqTime: new Date().getTime(),
								action: Object.toJSON({action: 'Originate', from: obj.fromchannel, to: obj.tochannel, callerid: obj.fromcallerid, type: 'internalCall'})
							}
						});
					}
				);
				_confirm.setHeader('Originate Call');
				break;
		}
		Monast.dd_backToStartPosition(this.id);
	},
	showUserpeerContextMenu: function (id)
	{
		this._contextMenu.clearContent();
		this._contextMenu.cfg.queueProperty("xy", this.getMousePosition());
	
		var originateCall = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doConfirm(
				new Template($("Template::Userpeer::Form::Originate::Dial").innerHTML).evaluate(p_oValue),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'Originate', from: p_oValue.channeltype + "/" + p_oValue.peername, to: $('Userpeer::Form::Originate::Dial::To').value, callerid: p_oValue.callerid, type: 'dial'})
						}
					});
				}
			);
			_confirm.setHeader('Originate Call');
		};
		var viewUserpeerInfo = function (p_sType, p_aArgs, p_oValue)
		{
			p_oValue.latency          = p_oValue.time == -1 ? "--" : p_oValue.time + " ms";
			p_oValue.channelVariables = [];
			
			if (p_oValue.variables.length > 0)
			{
				p_oValue.channelVariables.push('<tr><td colspan="2"><hr></td></tr>');
				p_oValue.channelVariables.push('<tr><td colspan="2" class="key" style="text-align: center;">Channel Variables</td></tr>');
			} 
			
			p_oValue.variables.each(function (v) {
				var item = v.split('=', 2);
				p_oValue.channelVariables.push('<tr><td class="key">' + item[0] + ':</td><td>' + item[1] + '</td></tr>');
			});
			
			Monast.doAlert(new Template($("Template::Userpeer::Info").innerHTML).evaluate(p_oValue));
			$("Template::Userpeer::Info::Table").innerHTML = $("Template::Userpeer::Info::Table").innerHTML + p_oValue.channelVariables.join("\n");
		};
		var addQueueMember = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doConfirm(
				"<div style='text-align: center'>Turn this User Member of Queue \"" + p_oValue.queue + "\"?</div><br>" + new Template($("Template::Userpeer::Info").innerHTML).evaluate(p_oValue.peer),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'QueueMemberAdd', queue: p_oValue.queue, location: p_oValue.peer.channeltype + '/' + p_oValue.peer.peername})
						}
					});
				}
			);
		};
		
		var u = this.userspeers.get(id);
		var m = [
			[
				{text: "Originate Call", onclick: {fn: originateCall, obj: u}},
				{text: "View User/Peer Info", onclick: {fn: viewUserpeerInfo, obj: u}}
			],
		];
		var addQueue = false;
		switch (u.channeltype)
		{
			case 'SIP':
				m[0].push({text: "Execute 'sip show peer " + u.peername + "'", onclick: {fn: Monast.requestInfo, obj: "sip show peer " + u.peername}});
				addQueue = true;
				break;
				
			case 'IAX2':
				m[0].push({text: "Execute 'iax2 show peer " + u.peername + "'", onclick: {fn: Monast.requestInfo, obj: "iax2 show peer " + u.peername}});
				addQueue = true;
				break;
				
			case 'DAHDI':
				m[0].push({text: "Execute 'dahdi show channel " + u.peername + "'", onclick: {fn: Monast.requestInfo, obj: "dahdi show channel " + u.peername}});
				break;
				
			case 'Khomp':
				var bc = u.peername.replace('B', '').replace('C', ' ');
				m[0].push({text: "Execute 'khomp channels show " + bc + "'", onclick: {fn: Monast.requestInfo, obj: "khomp channels show " + bc}});
				break;
		}
		
		if (addQueue)
		{
			var optionList = [];
			Monast.queues.keys().each(function (id) {
				var q = Monast.queues.get(id);
				var m = q.members.get(md5("queueMember-" + q.queue + '::' + u.channeltype + "/" + u.peername));
				if (Object.isUndefined(m))
					optionList.push({text: q.queue, onclick: {fn: addQueueMember, obj: {peer: u, queue: q.queue}}});
			});
			if (optionList.length > 0)
			{
				m.push([{text: "Turn Member of", url: "#teste", submenu: { id: "teste", itemdata: optionList}}]);
				this._contextMenu.setItemGroupTitle("Queues", m.length);
			}
		}
		
		var inviteMeetme = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doConfirm(
				"<div style='text-align: center'>Invite this User/Peer to Meetme \"" + p_oValue.meetme + "\"?</div><br>" + new Template($("Template::Userpeer::Info").innerHTML).evaluate(p_oValue.peer),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'Originate', from: p_oValue.peer.channeltype + "/" + p_oValue.peer.peername, to: p_oValue.meetme, callerid: p_oValue.peer.callerid, type: 'meetmeInviteUser'})
						}
					});
				}
			);
			_confirm.setHeader('Meetme Invite');
		};
		var meetmeList = [];
		Monast.meetmes.keys().each(function (id) {
			var m = Monast.meetmes.get(id);
			if (/\d+/.match(m.meetme))
				meetmeList.push({text: m.meetme, onclick: {fn: inviteMeetme, obj: {peer: u, meetme: m.meetme}}});
		});
		if (meetmeList.length > 0)
		{
			m.push([{text: "Invite to", url: "#meetme", submenu: { id: "meetme", itemdata: meetmeList}}]);
			this._contextMenu.setItemGroupTitle("Meetme", m.length);
		}
		
		this._contextMenu.addItems(m);
		this._contextMenu.setItemGroupTitle("User/Peer: " + u.channel, 0);
		this._contextMenu.render(document.body);
		this._contextMenu.show();
	},
	
	// Channels
	channels: new Hash(),
	processChannel: function (c)
	{
		c.id           = c.uniqueid;
		c.statecolor   = this.getColor(c.state);
		c.monitoricon  = c.monitor ? new Template($('Template::Channel::Monitor').innerHTML).evaluate(c) : "";
		c.monitortext  = c.monitor ? "Yes" : "No";
		c.channel      = c.channel.replace('<', '&lt;').replace('>', '&gt;');
		c.calleridname = c.calleridname != null ? c.calleridname.replace('<', '').replace('>', '') : "";
		c.calleridnum  = c.calleridnum != null ? c.calleridnum.replace('<', '').replace('>', '') : "";
		c.callerid     = new Template("#{calleridname} &lt;#{calleridnum}&gt;").evaluate(c);
		
		this.channels.set(c.id, c);
		
		if (!Object.isUndefined(c.subaction) && c.subaction == "Update")
		{
			Object.keys(c).each(function (key) {
				if ($(c.id + "-" + key))
					$(c.id + "-" + key).innerHTML = c[key];
				if (key == "state")
				{
					$(c.id + "-" + key).style.backgroundColor = c.statecolor;
					Monast.blink(c.id + "-" + key, c.statecolor);
				}
			});
			return;
		}
				
		var div           = document.createElement('div');
		div.id            = c.id;
		div.className     = 'channelDiv';
		div.innerHTML     = new Template($('Template::Channel').innerHTML).evaluate(c);
		div.oncontextmenu = function () { Monast.showChannelContextMenu(c.id); return false; };
		$('channelsDiv').appendChild(div);
		$('countChannels').innerHTML = this.channels.keys().length; 
	},
	removeChannel: function (c)
	{
		var channel = this.channels.unset(c.uniqueid);
		if (!Object.isUndefined(channel))
			$('channelsDiv').removeChild($(channel.id));
		$('countChannels').innerHTML = this.channels.keys().length;
	},
	showChannelContextMenu: function (id, returnOnly)
	{
		this._contextMenu.clearContent();
		this._contextMenu.cfg.queueProperty("xy", this.getMousePosition());
	
		var viewChannelInfo = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doAlert(new Template($("Template::Channel::Info").innerHTML).evaluate(p_oValue));
		};
		var requestMonitor = function (p_sType, p_aArgs, p_oValue)
		{
			var action = p_oValue.monitor ? "Stop" : "Start";
			Monast.doConfirm(
				"<div style='text-align: center'>" + action + " Monitor to this Channel?</div><br>" + new Template($("Template::Channel::Info").innerHTML).evaluate(p_oValue),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'Monitor' + action, channel: p_oValue.channel})
						}
					});
				}
			);
		};
		var requestHangup = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doConfirm(
				"<div style='text-align: center'>Request Hangup to this Channel?</div><br>" + new Template($("Template::Channel::Info").innerHTML).evaluate(p_oValue),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'Hangup', channel: p_oValue.channel})
						}
					});
				}
			);
		};
	
		var c = this.channels.get(id);
		var m = [
			[
				{text: c.monitor ? "Stop Monitor" : "Start Monitor", onclick: {fn: requestMonitor, obj: c}},
				{text: "Hangup", onclick: {fn: requestHangup, obj: c}},
				{text: "View Channel Info", onclick: {fn: viewChannelInfo, obj: c}},
				{text: "Execute 'core show channel " + c.channel + "'", onclick: {fn: Monast.requestInfo, obj: "core show channel " + c.channel}}
			]
		];
		
		if (!Object.isUndefined(returnOnly) && returnOnly)
			return m;
		
		this._contextMenu.addItems(m);
		this._contextMenu.setItemGroupTitle("Uniqueid:  " + c.uniqueid, 0);
		this._contextMenu.render(document.body);
		this._contextMenu.show();
	},
	
	// Bridges
	bridges: new Hash(),
	processBridge: function (b)
	{
		if (b.status == "Unlink")
		{
			this.removeBridge(b);
			return;
		}
	
		b.id              = md5(b.uniqueid + "+++" + b.bridgeduniqueid);
		b.statuscolor     = this.getColor(b.status);
		b.channel         = b.channel.replace('<', '&lt;').replace('>', '&gt;');
		b.bridgedchannel  = b.bridgedchannel.replace('<', '&lt;').replace('>', '&gt;');
		b.callerid        = new Template("#{calleridname} &lt;#{calleridnum}&gt;").evaluate(this.channels.get(b.uniqueid));
		b.bridgedcallerid = new Template("#{calleridname} &lt;#{calleridnum}&gt;").evaluate(this.channels.get(b.bridgeduniqueid));
		
		this.bridges.set(b.id, b);
		
		if (!Object.isUndefined(b.subaction) && b.subaction == "Update" && $(b.id))
		{
			Object.keys(b).each(function (key) {
				if ($(b.id + "-" + key))
				{
					$(b.id + "-" + key).innerHTML = b[key];
				}
			});
			if ($(b.id + "-statuscolor-fake"))
			{
				$(b.id + "-statuscolor-fake").style.backgroundColor = b.statuscolor;
				Monast.blink(b.id + "-statuscolor-fake", b.statuscolor);
			}
			if (b.status == "Link")
			{
				this.stopChrono(b.id);
				this.startChrono(b.id, parseInt(b.seconds));
			}
			return;
		}
		
		var div           = document.createElement('div');
		div.id            = b.id;
		div.className     = 'callDiv';
		div.innerHTML     = new Template($("Template::Bridge").innerHTML).evaluate(b);
		div.oncontextmenu = function () { Monast.showBridgeContextMenu(b.id); return false; };
		$('callsDiv').appendChild(div);
		
		if (b.status == "Link")
		{
			this.stopChrono(b.id);
			this.startChrono(b.id, parseInt(b.seconds));
		}
		
		// Drag & Drop
		var dd = new YAHOO.util.DD(div.id);
		dd.onMouseDown   = this.dd_setStartPosition;
		dd.onDragDrop    = this.dd_bridgeDrop;
		dd.onInvalidDrop = this.dd_invalidDrop;
		dd.onDragOver    = this.dd_dragOver;
		dd.onDragOut     = this.dd_dragOut;
		dd.validDrop     = ['peerTable'];
		this.dd.set(div.id, dd);
		
		$('countCalls').innerHTML = this.bridges.keys().length;
	},
	dd_bridgeDrop: function (e, id)
	{
		var bridge = Monast.bridges.get(this.id);
		switch ($(id).className)
		{
			case "peerTable":
				var peer = Monast.userspeers.get(id);
				var to   = /\<(\d+)\>/.exec(peer.callerid);
				if (to == null)
				{
					Monast.doWarn("This User/Peer does not have a valid callerid number to transfer to.");
					break;
				}
				var obj  = bridge;
				obj.tocallerid = peer.callerid;
				obj.tochannel  = peer.channeltype + "/" + peer.peername;
				obj.toexten    = to[1];
				Monast.doConfirm(
					"<div style='text-align: center'>Select Channel to Transfer?</div><br>" + new Template($("Template::Bridge::Form::Transfer::Internal").innerHTML).evaluate(obj),
					function () {
						new Ajax.Request('action.php', 
						{
							method: 'get',
							parameters: {
								reqTime: new Date().getTime(),
								action: Object.toJSON({action: 'Transfer', from: $$("input[name=Template::Bridge::Form::Transfer::Internal::From]:checked")[0].value, to: obj.toexten, type: 'normal'})
							}
						});
					}
				);
				_confirm.setHeader('Transfer Call');
				break;
		}
		
		Monast.dd_backToStartPosition(this.id);
	},
	removeBridge: function (b)
	{
		var id     = md5(b.uniqueid + "+++" + b.bridgeduniqueid);
		var bridge = this.bridges.unset(id);
		if (!Object.isUndefined(bridge))
		{
			$('callsDiv').removeChild($(bridge.id));
			this.stopChrono(id);
		}
		this.dd.unset(id);
		$('countCalls').innerHTML = this.bridges.keys().length;
	},
	showBridgeContextMenu: function (id)
	{
		this._contextMenu.clearContent();
		this._contextMenu.cfg.queueProperty("xy", this.getMousePosition());
		
		var requestPark = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doConfirm(
				"<div style='text-align: center'>Select Channel to Park?</div><br>" + new Template($("Template::Bridge::Form::Park").innerHTML).evaluate(p_oValue),
				function () {
					var channel  = $$("input[name=Template::Bridge::Form::Park::Channel]:checked")[0].value;
					var announce = p_oValue.channel == channel ? p_oValue.bridgedchannel : p_oValue.channel;
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'Park', channel: channel, announce: announce})
						}
					});
				}
			);
		};
		var requestHangup = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doConfirm(
				"<div style='text-align: center'>Request Hangup to this Call?</div><br>" + new Template($("Template::Bridge::Info").innerHTML).evaluate(p_oValue),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'Hangup', channel: p_oValue.channel})
						}
					});
				}
			);
		};
		var viewCallInfo = function (p_sType, p_aArgs, p_oValue)
		{
			if (p_oValue.status == "Link")
				p_oValue._duration = $("chrono-" + p_oValue.id).innerHTML;
			Monast.doAlert(new Template($("Template::Bridge::Info").innerHTML).evaluate(p_oValue));
		};
		
		var b = this.bridges.get(id);
		var m = [
			[
			 	{text: "Park", onclick: {fn: requestPark, obj: b}},
				{text: "Hangup", onclick: {fn: requestHangup, obj: b}},
				{text: "Source Channel", url: "#SourceChannel", submenu: {id: "SourceChannel", itemdata: Monast.showChannelContextMenu(b.uniqueid, true)}},
				{text: "Destination Channel", url: "#DestinationChannel", submenu: {id: "DestinationChannel", itemdata: Monast.showChannelContextMenu(b.bridgeduniqueid, true)}},
				{text: "View Call Info", onclick: {fn: viewCallInfo, obj: b}},
			]
		];
		
		var inviteMeetme = function (p_sType, p_aArgs, p_oValue)
		{
			p_oValue.bridge._duration = $('chrono-' + p_oValue.bridge.id).innerHTML;
			Monast.doConfirm(
				"<div style='text-align: center'>Invite this Call to Meetme \"" + p_oValue.meetme + "\"?</div><br>" + new Template($("Template::Bridge::Info").innerHTML).evaluate(p_oValue.bridge),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'Transfer', from: p_oValue.bridge.channel, extrachannel: p_oValue.bridge.bridgedchannel, to: p_oValue.meetme, type: 'meetme'})
						}
					});
				}
			);
			_confirm.setHeader('Meetme Invite');
		};
		var meetmeList = [];
		Monast.meetmes.keys().each(function (id) {
			var m = Monast.meetmes.get(id);
			if (/\d+/.match(m.meetme))
				meetmeList.push({text: m.meetme, onclick: {fn: inviteMeetme, obj: {bridge: b, meetme: m.meetme}}});
		});
		if (meetmeList.length > 0)
		{
			m.push([{text: "Invite to", url: "#meetme", submenu: { id: "meetme", itemdata: meetmeList}}]);
			this._contextMenu.setItemGroupTitle("Meetme", 1);
		}
		
		this._contextMenu.addItems(m);
		this._contextMenu.setItemGroupTitle("Call:  " + b.uniqueid + " -> " + b.bridgeduniqueid, 0);
		this._contextMenu.render(document.body);
		this._contextMenu.show();
	},
	
	// Meetmes
	meetmes: new Hash(),
	processMeetme: function (m)
	{
		m.id = md5("meetme-" + m.meetme);
		
		if (Object.isUndefined(this.meetmes.get(m.id))) // Meetme does not exists
		{
			var div       = document.createElement('div');
			div.id        = m.id;
			div.className = 'meetmeDivWrap';
			div.innerHTML = new Template($("Template::Meetme").innerHTML).evaluate(m);
			$('meetmeDivWrapper').appendChild(div);
		}
		else
		{
			$(m.id).innerHTML = new Template($("Template::Meetme").innerHTML).evaluate(m);
		}
	
		if (!Object.isArray(m.users))
		{
			var keys = Object.keys(m.users).sort();
			keys.each(function (user) {
				var user          = m.users[user];
				user.userinfo     = (user.calleridnum && user.calleridname) ? new Template("#{calleridname} &lt;#{calleridnum}&gt;").evaluate(user) : user.channel;
				var divUser       = document.createElement("div");
				divUser.className = 'meetmeDiv';
				divUser.innerHTML = new Template($("Template::Meetme::User").innerHTML).evaluate(user);
				divUser.oncontextmenu = function () { Monast.showMeetmeUserContextMenu(m.id, user); return false; };
				$(m.id).appendChild(divUser);
			});
			$("countMeetme-" + m.id).innerHTML = keys.length;
		}

		this.meetmes.set(m.id, m);
	},
	removeMeetme: function (m)
	{
		var id     = md5("meetme-" + m.meetme);
		var meetme = this.meetmes.unset(id);
		if (!Object.isUndefined(meetme))
		{
			$('meetmeDivWrapper').removeChild($(meetme.id));
		}
	},
	_meetmeInviteNumbers: function (foo, m)
	{
		if (m == null)
		{
			var d = new Date();
			m     = {meetme: "Monast-" + parseInt(d.getTime() / 1000)};
		}
		Monast.doConfirm(
			new Template($("Template::Meetme::Form::InviteNumbers").innerHTML).evaluate(m),
			function () {
				new Ajax.Request('action.php', 
				{
					method: 'get',
					parameters: {
						reqTime: new Date().getTime(),
						action: Object.toJSON({action: 'Originate', from: $('Meetme::Form::InviteNumbers::Numbers').value, to: $('Meetme::Form::InviteNumbers::Meetme').value, type: 'meetmeInviteNumbers'})
					}
				});
			}
		);
		_confirm.setHeader('Invite Numbers to Meetme');
	},
	showMeetmeContextMenu: function (id)
	{
		this._contextMenu.clearContent();
		this._contextMenu.cfg.queueProperty("xy", this.getMousePosition());
		
		var inviteNumbers = function (p_sType, p_aArgs, p_oValue)
		{
			Monast._meetmeInviteNumbers(null, p_oValue);
		};
		
		var meetme = this.meetmes.get(id);
		var m = [
			[
				{text: "Invite Numbers", onclick: {fn: inviteNumbers, obj: meetme}},
			]
		];
		this._contextMenu.addItems(m);
		this._contextMenu.setItemGroupTitle("Meetme:  " + meetme.meetme, 0);
		this._contextMenu.render(document.body);
		this._contextMenu.show();
	},
	showMeetmeUserContextMenu: function (id, user)
	{
		this._contextMenu.clearContent();
		this._contextMenu.cfg.queueProperty("xy", this.getMousePosition());
		
		var viewUserInfo = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doAlert(new Template($("Template::Meetme::User::Info").innerHTML).evaluate(p_oValue));
		};
		var kickUser = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doConfirm(
				"<div style='text-align: center'>Request Kick to this User from Meetme \"" + p_oValue.meetme + "\"?</div><br>" + new Template($("Template::Meetme::User::Info").innerHTML).evaluate(p_oValue.user),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'MeetmeKick', meetme: p_oValue.meetme, usernum: p_oValue.user.usernum})
						}
					});
				}
			);
		};
		
		var meetme = this.meetmes.get(id);
		var m = [
			[
				{text: "Kick User", onclick: {fn: kickUser, obj: {meetme: meetme.meetme, user: user}}},
				{text: "View User Info", onclick: {fn: viewUserInfo, obj: user}}
			]
		];
		this._contextMenu.addItems(m);
		this._contextMenu.setItemGroupTitle("Meetme User:  " + user.userinfo, 0);
		this._contextMenu.render(document.body);
		this._contextMenu.show();
	},
	
	// Parked Calls
	parkedCalls: new Hash(),
	processParkedCall: function (p)
	{
		p.id = md5("parkedCall-" + p.channel);
		
		if (Object.isUndefined(this.parkedCalls.get(p.id))) // ParkedCall does not exists
		{
			var div       = document.createElement('div');
			div.id        = p.id;
			div.className = 'parkedDiv';
			div.innerHTML = new Template($("Template::ParkedCall").innerHTML).evaluate(p);
			$('parkedsDiv').appendChild(div);
		}
		else
		{
			$(p.id).innerHTML = new Template($("Template::ParkedCall").innerHTML).evaluate(p);
		}
		
		this.parkedCalls.set(p.id, p);
		$("countParked").innerHTML = this.parkedCalls.keys().length;
	},
	removeParkedCall: function (p)
	{
		var id     = md5("parkedCall-" + p.channel);
		var parked = this.parkedCalls.unset(id);
		if (!Object.isUndefined(parked))
		{
			$('parkedsDiv').removeChild($(parked.id));
		}
		$("countParked").innerHTML = this.parkedCalls.keys().length;
	},
	
	// Queues
	queuesDual: [],
	queues: new Hash(),
	processQueue: function (q)
	{
		q.id = md5("queue-" + q.queue);
		
		if (!Object.isUndefined(q.subaction) && q.subaction == "Update")
		{
			Object.keys(q).each(function (key) {
				if ($(q.id + "-" + key))
					$(q.id + "-" + key).innerHTML = q[key];
			});
			return;
		}
		
		if (Object.isUndefined(this.queues.get(q.id))) // Queue does not exists
		{
			var div       = document.createElement('div');
			div.id        = q.id;
			div.className = "queueDiv";
			div.innerHTML = new Template($("Template::Queue").innerHTML).evaluate(q);
			
			// Lookup Dual Free
			var dualid = null;
			if (this.queuesDual.length == 0)
			{
				this.queuesDual.push([div.id]);
				dualid = "dual::0";
			}
			else
			{
				var l = this.queuesDual.length;
				if (this.queuesDual[l - 1].length < 2)
				{
					this.queuesDual[l - 1].push(div.id);
					dualid = "dual::" + (l - 1);
				}
				else
				{
					this.queuesDual.push([div.id]);
					dualid = "dual::" + l;
				}
			}
			
			var dual = $(dualid);
			if (!dual)
			{
				dual             = document.createElement('div');
				dual.id          = dualid;
				dual.className   = 'queueDualDiv';
			}
			
			dual.appendChild(div);
			$('fieldset-queuedual').appendChild(dual);
		}
		else
		{
			$(q.id).innerHTML = new Template($("Template::Queue").innerHTML).evaluate(q);
		}
		q.members = new Hash();
		q.clients = new Hash();
		q.calls   = new Hash();
		this.queues.set(q.id, q);
	},
	processQueueMember: function (m)
	{
		m.id          = md5("queueMember-" + m.queue + '::' + m.location);
		m.queueid     = md5("queue-" + m.queue);
		m.statustext_nochrono = m.paused == '1' ? 'Paused' : m.statustext;
		m.statustext  = m.paused == '1' ? 'Paused<br><span style="font-family: monospace;" id="chrono-' + m.id + '">00:00:00</span>' : m.statustext;
		m.pausedtext  = m.paused == "1" ? "Yes" : "No";
		m.statuscolor = this.getColor(m.statustext); 
		
		var old = this.queues.get(m.queueid).members.get(m.id);
		this.queues.get(m.queueid).members.set(m.id, m);
		
		if (!Object.isUndefined(m.subaction) && m.subaction == "Update")
		{
			Object.keys(m).each(function (key) {
				if ($(m.id + "-" + key))
				{
					$(m.id + "-" + key).innerHTML = m[key];
					if (key == 'statustext')
					{
						$(m.id + "-" + key).style.backgroundColor = m.statuscolor;
						if (old[key] != m[key])
							Monast.blink(m.id + "-" + key, m.statuscolor);
					}
				}
			});
			this.stopChrono(m.id);
			if (m.paused == '1')
				this.startChrono(m.id, m.pausedur);
			return;
		}
		
		var div       = document.createElement('div');
		div.id        = m.id;
		div.className = 'queueMembersDiv';
		div.innerHTML = new Template($("Template::Queue::Member").innerHTML).evaluate(m);
		div.oncontextmenu = function () { Monast.showQueueMemberContextMenu(m.queueid, m.id); return false; };
		
		$('queueMembers-' + m.queueid).appendChild(div);
		$('queueMembersCount-' + m.queueid).innerHTML = this.queues.get(m.queueid).members.keys().length;
		
		this.stopChrono(m.id);
		if (m.paused == '1')
			this.startChrono(m.id, m.pausedur);
	},
	removeQueueMember: function (m)
	{
		var id       = md5("queueMember-" + m.queue + '::' + m.location);
		var queueid  = md5("queue-" + m.queue);
		var member = this.queues.get(queueid).members.unset(id);
		if (!Object.isUndefined(member))
		{
			this.stopChrono(member.id);
			$('queueMembers-' + member.queueid).removeChild($(member.id));
		}
		$('queueMembersCount-' + member.queueid).innerHTML = this.queues.get(member.queueid).members.keys().length;
	},
	showQueueMemberContextMenu: function (queueid, id)
	{
		this._contextMenu.clearContent();
		this._contextMenu.cfg.queueProperty("xy", this.getMousePosition());
	
		var requestMemberPause = function (p_sType, p_aArgs, p_oValue)
		{
			var action = p_oValue.paused == "0" ? "Pause" : "Unpause";
			Monast.doConfirm(
				"<div style='text-align: center'>" + action + " this Queue Member?</div><br>" + new Template($("Template::Queue::Member::Info").innerHTML).evaluate(p_oValue),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'QueueMember' + action, queue: p_oValue.queue, location: p_oValue.location})
						}
					});
				}
			);
		};
		var requestMemberRemove = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doConfirm(
				"<div style='text-align: center'>Remove this Member from Queue \"" + p_oValue.queue + "\"?</div><br>" + new Template($("Template::Queue::Member::Info").innerHTML).evaluate(p_oValue),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'QueueMemberRemove', queue: p_oValue.queue, location: p_oValue.location})
						}
					});
				}
			);
		};
		var viewMemberInfo = function (p_sType, p_aArgs, p_oValue)
		{
			p_oValue.lastcalltext = new Date(p_oValue.lastcall * 1000).toLocaleString();
			Monast.doAlert(new Template($("Template::Queue::Member::Info").innerHTML).evaluate(p_oValue));
		};
		
		var qm = this.queues.get(queueid).members.get(id);
		var m = [
			[
				{text: qm.paused == "0" ? "Pause Member" : "Unpause Member", onclick: {fn: requestMemberPause, obj: qm}},
				{text: "Remove Member", disabled: qm.membership == "static", onclick: {fn: requestMemberRemove, obj: qm}},
				{text: "View Member Info", onclick: {fn: viewMemberInfo, obj: qm}}
			]
		];
		this._contextMenu.addItems(m);
		this._contextMenu.setItemGroupTitle("Queue Member:  " + qm.name, 0);
		this._contextMenu.render(document.body);
		this._contextMenu.show();
	},
	processQueueClient: function (c)
	{
		c.id          = md5("queueClient-" + c.queue + '::' + c.uniqueid);
		c.queueid     = md5("queue-" + c.queue);
		c.callerid    = c.channel;
		
		if (c.calleridname)
			c.callerid = c.calleridname + " &lt;" + c.calleridnum + "&gt;";
		
		if (!Object.isUndefined(c.subaction) && c.subaction == "Update")
		{
			Object.keys(c).each(function (key) {
				if ($(c.id + "-" + key))
					$(c.id + "-" + key).innerHTML = c[key];
			});
			this.stopChrono(c.id);
			this.startChrono(c.id, c.seconds);
			return;
		}
		
		var div       = document.createElement('div');
		div.id        = c.id;
		div.className = 'queueClientsDiv';
		div.innerHTML = new Template($("Template::Queue::Client").innerHTML).evaluate(c);
		div.oncontextmenu = function () { Monast.showQueueClientContextMenu(c.queueid, c.id); return false; };
		$('queueClients-' + c.queueid).appendChild(div);
		
		this.stopChrono(c.id);
		this.startChrono(c.id, c.seconds);
		
		this.queues.get(c.queueid).clients.set(c.id, c);
		$('queueClientsCount-' + c.queueid).innerHTML = this.queues.get(c.queueid).clients.keys().length;
	},
	removeQueueClient: function (c)
	{
		var id       = md5("queueClient-" + c.queue + '::' + c.uniqueid);
		var queueid  = md5("queue-" + c.queue);
		var client   = this.queues.get(queueid).clients.unset(id);
		if (!Object.isUndefined(client))
		{
			this.stopChrono(client.id);
			$('queueClients-' + client.queueid).removeChild($(client.id));
		}
		$('queueClientsCount-' + client.queueid).innerHTML = this.queues.get(client.queueid).clients.keys().length;
	},
	showQueueClientContextMenu: function (queueid, id)
	{
		this._contextMenu.clearContent();
		this._contextMenu.cfg.queueProperty("xy", this.getMousePosition());
	
		var requestHangup = function (p_sType, p_aArgs, p_oValue)
		{
			Monast.doConfirm(
				"<div style='text-align: center'>Drop this Queue Client?</div><br>" + new Template($("Template::Queue::Client::Info").innerHTML).evaluate(p_oValue),
				function () {
					new Ajax.Request('action.php', 
					{
						method: 'get',
						parameters: {
							reqTime: new Date().getTime(),
							action: Object.toJSON({action: 'Hangup', channel: p_oValue.channel})
						}
					});
				}
			);
		};
		var viewClientInfo = function (p_sType, p_aArgs, p_oValue)
		{
			p_oValue.pausedtext = p_oValue.paused == "1" ? "True" : "False";
			p_oValue.waittime   = new Date(p_oValue.jointime * 1000).toLocaleString();
			Monast.doAlert(new Template($("Template::Queue::Client::Info").innerHTML).evaluate(p_oValue));
		};
		
		var qc = this.queues.get(queueid).clients.get(id);
		var c = [
			[
				{text: "Drop Client (Hangup)", onclick: {fn: requestHangup, obj: qc}},
				{text: "View Client Info", onclick: {fn: viewClientInfo, obj: qc}}
			]
		];
		this._contextMenu.addItems(c);
		this._contextMenu.setItemGroupTitle("Queue Client:  " + qc.callerid, 0);
		this._contextMenu.render(document.body);
		this._contextMenu.show();
	},
	processQueueCall: function (c)
	{
		c.id       = md5("queueCall-" + c.client.uniqueid + "::" + c.member.location);
		c.queueid  = md5("queue-" + c.client.queue);
		c.memberid = md5("queueMember-" + c.member.queue + '::' + c.member.location); 
		
		c.callerid = c.client.channel;
		
		if (c.client.calleridname)
			c.callerid = c.client.calleridname + " &lt;" + c.client.calleridnum + "&gt;";
		
		if (!$(c.id) && c.link)
		{
			var div       = document.createElement('div');
			div.id        = c.id;
			div.innerHTML = new Template($("Template::Queue::Call").innerHTML).evaluate(c);
			div.oncontextmenu = function () { return false; };
			$(c.memberid).innerHTML += div.innerHTML;
			
			this.stopChrono(c.id);
			this.startChrono(c.id, c.seconds);
		}
		this.queues.get(c.queueid).calls.set(c.id, c);
	},
	removeQueueCall: function (c)
	{
		c.id       = md5("queueCall-" + c.uniqueid + "::" + c.location);
		c.queueid  = md5("queue-" + c.queue);
		call       = this.queues.get(c.queueid).calls.unset(c.id);
		if (!Object.isUndefined(call))
		{
			this.stopChrono(c.id);
			$(call.memberid).removeChild($(call.id));
		}
	},

	// Process Events
	processEvent: function (event)
	{
		if ($('debugMsg'))
			$('debugMsg').innerHTML += Object.toJSON(event) + "<br>\r\n";
		
		if (!Object.isUndefined(event.objecttype))
		{
			//console.log("ObjectType:", event.objecttype, event);
			switch (event.objecttype)
			{
				case "User/Peer":
					this.processUserpeer(event);
					break;
					
				case "Channel":
					this.processChannel(event);
					break;
					
				case "Bridge":
					this.processBridge(event);
					break;
					
				case "Meetme":
					this.processMeetme(event);
					break;
					
				case "ParkedCall":
					this.processParkedCall(event);
					break;
					
				case "Queue":
					this.processQueue(event);
					break;
					
				case "QueueMember":
					this.processQueueMember(event);
					break;
					
				case "QueueClient":
					this.processQueueClient(event);
					break;
					
				case "QueueCall":
					this.processQueueCall(event);
					break;
			}
		}
		
		if (!Object.isUndefined(event.action))
		{
			//console.log("Action:", event.action, event);
			switch (event.action)
			{
				case "Error":
					this._statusError = true;
					this.doError(event.message);
					return;
					
				case "Reload":
					this._statusReload = true;
					setTimeout("location.href = 'index.php'", event.time);
					return;
					
				case "RemoveChannel":
					this.removeChannel(event);
					break;
					
				case "RemoveBridge":
					this.removeBridge(event);
					break;
					
				case "RemoveMeetme":
					this.removeMeetme(event);
					break;
					
				case "RemoveParkedCall":
					this.removeParkedCall(event);
					break;
					
				case "RemoveQueueMember":
					this.removeQueueMember(event);
					break;
					
				case "RemoveQueueClient":
					this.removeQueueClient(event);
					break;
					
				case "RemoveQueueCall":
					this.removeQueueCall(event);
					break;
					
				case "CliResponse":
					this.cliResponse(event);
					break;
					
				case "RequestInfoResponse":
					this.requestInfoResponse(event);
					break;
			}
		}
	},
	
	// Request Status via AJAX
	_statusError: false,
	_statusReload: false,
	requestStatus: function ()
	{
		if (this._statusError)
		{
			$('_reqStatus').innerHTML = "<font color='red'>Reload needed, Press F5.</font>";
			return;
		}
		if (this._statusReload)
		{
			$('_reqStatus').innerHTML = "Reloading, please wait.";
			return;
		}
			
		new Ajax.Request('status.php', 
		{
			method: 'get',
			parameters: {
				reqTime: new Date().getTime()
			},
			
			onCreate:        function() { $('_reqStatus').innerHTML = 'Create'; },
			onUninitialized: function() { $('_reqStatus').innerHTML = 'Uninitialized'; },
			onLoading:       function() { $('_reqStatus').innerHTML = 'On Line'; },
			onLoaded:        function() { $('_reqStatus').innerHTML = 'Loaded'; },
			onInteractive:   function() { $('_reqStatus').innerHTML = 'Interactive'; },
			onComplete:      function() { $('_reqStatus').innerHTML = 'Complete'; Monast.requestStatus(); },
			
			onSuccess: function(transport)
			{
				var events = transport.responseJSON;
				events.each(function (event) 
				{
					try
					{
						Monast.processEvent(event);
					}
					catch (e)
					{
						console.log(e, event);
					}
				});
			},
			onFailure: function()
			{
				this._statusError = true;
				doError('!! MonAst ERROR !!\n\nAn error ocurred while requesting status!\nPlease press F5 to reload MonAst.');
			}
		});
	},
	
	// Alerts & Messages
	doAlert: function (message)
	{
		_alert.setHeader('Information');
		_alert.setBody("<table><tr><td valign='top'><span class='yui-icon infoicon'></span></td><td>" + message + "</td></tr></table>");
		_alert.cfg.setProperty("fixedcenter", true);
		_alert.cfg.setProperty("constraintoviewport", true);
		_alert.render();
		_alert.show();
	},
	doError: function (message)
	{
		_alert.setHeader('Error');
		_alert.setBody("<table><tr><td valign='top'><span class='yui-icon blckicon'></span></td><td>" + message + "</td></tr></table>");
		_alert.cfg.setProperty("fixedcenter", true);
		_alert.cfg.setProperty("constraintoviewport", true);
		_alert.render();
		_alert.show();
	},
	doWarn: function (message)
	{
		_alert.setHeader('Warning');
		_alert.setBody("<table><tr><td valign='top'><span class='yui-icon warnicon'></span></td><td>" + message + "</td></tr></table>");
		_alert.cfg.setProperty("fixedcenter", true);
		_alert.cfg.setProperty("constraintoviewport", true);
		_alert.render();
		_alert.show();
	},
	doConfirm: function (message, handleYes, handleNo)
	{
		if (!handleNo)
			handleNo = function () { };
	
		var buttons = [
			{text: "Yes", handler: function () { this.hide(); handleYes(); }},
			{text: "No", handler: function () { this.hide(); handleNo(); }}
		];
		
		_confirm.setHeader('Confirmation');
		_confirm.setBody("<table><tr><td valign='top'><span class='yui-icon hlpicon'></span></td><td>" + message + "</td></tr></table>");
		_confirm.cfg.setProperty("buttons", buttons); 
		_confirm.render();
		_confirm.show();
	},
	
	// Monast INIT
	init: function ()
	{
		YAHOO.util.DDM.mode = YAHOO.util.DDM.POINT;
		
		// CheckBox Buttons for Mixed Pannels
		window.ocheckBoxTab1 = new YAHOO.widget.Button("checkBoxTab1", { label: "Peers/Users" });
		window.ocheckBoxTab1.addListener('checkedChange', this.showHidePannels);
		window.ocheckBoxTab2 = new YAHOO.widget.Button("checkBoxTab2", { label:"Meetme Rooms" });
		window.ocheckBoxTab2.addListener('checkedChange', this.showHidePannels);
		window.ocheckBoxTab3 = new YAHOO.widget.Button("checkBoxTab3", { label:"Channels/Calls" });
		window.ocheckBoxTab3.addListener('checkedChange', this.showHidePannels);
		window.ocheckBoxTab4 = new YAHOO.widget.Button("checkBoxTab4", { label:"Parked Calls" });
		window.ocheckBoxTab4.addListener('checkedChange', this.showHidePannels);
		window.ocheckBoxTab5 = new YAHOO.widget.Button("checkBoxTab5", { label:"Queues" });
		window.ocheckBoxTab5.addListener('checkedChange', this.showHidePannels);
		
		window._buttons = new Array(ocheckBoxTab1, ocheckBoxTab2, ocheckBoxTab3, ocheckBoxTab4, ocheckBoxTab5);
		
		// Cookie to save View state
		window._state = YAHOO.util.Cookie.get("_state");
		if (!_state)
		{
			_state = {activeIndex: 1, buttons: {'checkBoxTab1': false, 'checkBoxTab2': false, 'checkBoxTab3': false, 'checkBoxTab4': false, 'checkBoxTab5': false}};
			YAHOO.util.Cookie.set('_state', Object.toJSON(_state));
		}
		else
		{
			_state = _state.evalJSON();
		}
		
		// TabPannel and Listeners
		window._tabPannel = new YAHOO.widget.TabView('TabPannel');
		_tabPannel.addListener('beforeActiveTabChange', function(e) {
			var pannels = new Array('peersDiv', 'meetmesDiv', 'chanCallDiv', 'parkedCallsDiv', 'queuesDiv');
			pannels.each(function (pannel) {
				$(pannel).className = 'yui-hidden';
			});
		
			var tabs = this.get('tabs');
			tabs.each(function (tab, i) {
				if (tab.get('label') == e.newValue.get('label'))
				{
					_state.activeIndex = i;
					YAHOO.util.Cookie.set('_state', Object.toJSON(_state));
				}
			});
		});
		_tabPannel.getTab(0).addListener('click', function(e) {
			_buttons.each(function (button) {
				button.set('checked', _state.buttons[button.get('id')]);
			});
		});
		_tabPannel.set('activeIndex', _state.activeIndex);
		if (_state.activeIndex == 0)
		{
			_buttons.each(function (button) {
				button.set('checked', _state.buttons[button.get('id')]);
			});
		}
		
		// Drag&Drop ActionsDIV Targets
		window._dTrash  = new YAHOO.util.DDTarget("trash");
		window._dPark   = new YAHOO.util.DDTarget("park");
		window._dRecord = new YAHOO.util.DDTarget("record");
		
		if (!Monast.IE)
			document.captureEvents(Event.MOUSEMOVE);
		document.onmousemove = Monast.followMousePos;
	},
	
	showHidePannels: function (e)
	{
		$(this.get('value')).className = (e.newValue ? '' : 'yui-hidden');
		_state.buttons[this.get('id')] = e.newValue;
		YAHOO.util.Cookie.set('_state', Object.toJSON(_state));
	},
	
	hideTab: function (tabName)
	{
		var tabs = {
			"Mixed Pannels"  : "Tab0",
			"Peers/Users"    : "Tab1",
			"Meetme Rooms"   : "Tab2",
			"Channels/Calls" : "Tab3",
			"Parked Calls"   : "Tab4",
			"Queues"         : "Tab5",
			"Asterisk CLI"   : "Tab6",
			"Debug"          : "Tab7"
		};
		if (!Object.isUndefined(tabs[tabName]))
		{
			if ($("li" + tabs[tabName]))
			{
				$("li" + tabs[tabName]).hide();
				if ($('checkBox' + tabs[tabName]))
					setTimeout("$('checkBox" + tabs[tabName] + "').hide()", 1000);
			}
		}
	},
	
	// Drag&Drop
	dd: new Hash(),
	dd_setStartPosition: function (e)
	{
		var el          = $(this.id);
		this.startPos   = YAHOO.util.Dom.getXY(YAHOO.util.Dom.get(this.id));
		this.origZindex = el.getStyle('z-index') == null ? 1 : el.getStyle('z-index');
		el.setStyle({'z-index': 50});
	},
	dd_backToStartPosition: function (id)
	{
		var dd = Monast.dd.get(id);
		new YAHOO.util.Motion(  
			id, {  
				points: {
					to: dd.startPos
				}
			},
			0.3,
			YAHOO.util.Easing.easeOut
		).animate();

		if (dd.origZindex)
			$(id).setStyle({zIndex: dd.origZindex});

		if (dd.lastOver)
			$(dd.lastOver).setStyle({opacity: 1});
	},
	dd_invalidDrop: function (e)
	{
		Monast.dd_backToStartPosition(this.id);
	},
	dd_dragOver: function (e, id)
	{
		var dd = Monast.dd.get(this.id);
		if (dd.validDrop.indexOf($(id).className) != -1)
		{
			$(id).setStyle({opacity: 0.5});
			this.lastOver = id;
		}
	},
	dd_dragOut: function (e, id)
	{
		$(id).setStyle({opacity: 1});
	},
	
	// Chrono
	_chrono: new Hash(),
	startChrono: function (id, seconds, hideSeconds)
	{
		if (!MONAST_CALL_TIME)
			return;

		var hideSeconds = Object.isUndefined(hideSeconds) ? false : hideSeconds;
		var chrono      = this._chrono.get(id);
		
		if (Object.isUndefined(chrono))
		{
			if (seconds)
			{
				var d  = new Date(seconds * 1000);
				chrono = {hours: d.getUTCHours(), minutes: d.getUTCMinutes(), seconds: d.getUTCSeconds(), run: null, showSeconds: !hideSeconds};
			}
			else
			{
				chrono = {hours: 0, minutes: 0, seconds: 0, run: null, showSeconds: !hideSeconds};
			}
			this._chrono.set(id, chrono);
		}
		else
		{
			if (Object.isUndefined(seconds))
			{
				chrono.seconds += 1;
			}
			else
			{
				var d = new Date(secs * 1000);
				chrono.seconds = d.getUTCSeconds();
				chrono.minutes = d.getUTCMinutes();
				chrono.hours   = d.getUTCHours();
			}
			
			if (chrono.seconds == 60)
			{
				chrono.seconds  = 0;
				chrono.minutes += 1;
			}
			if (chrono.minutes == 60)
			{
				chrono.minutes = 0;
				chrono.hours  += 1;
			}
		}
		
		var seconds = chrono.seconds < 10 ? '0' + chrono.seconds : chrono.seconds;
		var minutes = chrono.minutes < 10 ? '0' + chrono.minutes : chrono.minutes;
		var hours   = chrono.hours < 10 ? '0' + chrono.hours : chrono.hours;

		var f = $('chrono-' + id);
		if (!Object.isUndefined(f))
			f.innerHTML = hours + ':' + minutes + (chrono.showSeconds ? ':' + seconds : '');		

		chrono.run = setTimeout("Monast.startChrono('" + id + "')", 1000);	
	},
	stopChrono: function (id)
	{
		var chrono = this._chrono.unset(id);
		if (!Object.isUndefined(chrono))
			clearTimeout(chrono.run);
	},
	
	// Extra Utils
	IE: document.all ? true : false,
	mouseX: 0,
	mouseY: 0,
	followMousePos: function (e)
	{
		if (Monast.IE)
		{
			Monast.mouseX = event.clientX + document.body.scrollLeft;
			Monast.mouseY = event.clientY + document.body.scrollTop;
		}
		else
		{
			Monast.mouseX = e.pageX;
			Monast.mouseY = e.pageY;
		}
		if (Monast.mouseX < 0) {Monast.mouseX = 0;}
		if (Monast.mouseY < 0) {Monast.mouseY = 0;}
		return true;
	},
	getMousePosition: function ()
	{
		return [Monast.mouseX, Monast.mouseY];
	},
	
	// User Actions
	doLogin: function ()
	{
		var username = $('_username').value;
		var secret   = $('_secret').value;
		
		if (!username)
		{
			Monast.doAlert('You must define an user.');
			$('_reqStatus').innerHTML = "<font color='red'>User not defined!</font>";
		}
		else
		{
			new Ajax.Request('login.php', {
				method: 'post',
				parameters: {
					reqTime: new Date().getTime(),
					username: username,
					secret: secret
				},
				onCreate: function () {
					$('_reqStatus').innerHTML = 'Authenticating, please wait...';
				},
				onSuccess: function (r) {
					var json = r.responseJSON;
					if (json['error'])
					{
						$('_reqStatus').innerHTML = "<font color='red'>Monast Error!</font>";;
						Monast.doError(json['error']);
					}
					if (json['success'])
					{
						$('_reqStatus').innerHTML = "Authenticated, reloading...";
						setTimeout("location.href = 'index.php'", 1000);
					}
				}
			});
		}
		return false;
	},
	doLogout: function ()
	{
		$('_reqStatus').innerHTML = "Logging out, please wait...";
		new Ajax.Request('action.php', 
		{
			method: 'get',
			parameters: {
				reqTime: new Date().getTime(),
				action: Object.toJSON({action: 'Logout'})
			}
		});
	},
	
	changeServer: function (server)
	{
		$('_reqStatus').innerHTML = "Changing Server...";
		new Ajax.Request('action.php', 
		{
			method: 'get',
			parameters: {
				reqTime: new Date().getTime(),
				action: Object.toJSON({action: 'ChangeServer', server: server})
			}
		});
	},
	
	onKeyPressCliCommand: function (e)
	{
		if (e.keyCode == 13 && $('cliCommand').value.trim()) //Enter
			Monast.cliCommand();
	},
	cliCommand: function ()
	{
		var command = $('cliCommand').value.trim();
		$('cliCommand').value = '';
		
		$('cliResponse').value += '\r\n> ' + command;
		$('cliResponse').scrollTop = $('cliResponse').scrollHeight - $('cliResponse').offsetHeight + 10;
		
		if (command)
		{
			new Ajax.Request('action.php', 
			{
				method: 'get',
				parameters: {
					reqTime: new Date().getTime(),
					action: Object.toJSON({action: 'CliCommand', command: command})
				}
			});
		}
	},
	cliResponse: function (r)
	{
		r.response.each(function (line) {
			$('cliResponse').value += '\r\n' + line;
			$('cliResponse').scrollTop = $('cliResponse').scrollHeight - $('cliResponse').offsetHeight + 10;
		});
		$('cliResponse').value += '\r\n';
	},
	
	requestInfo: function (p_sType, p_aArgs, p_oValue)
	{
		var command = p_oValue;
		new Ajax.Request('action.php', 
		{
			method: 'get',
			parameters: {
				reqTime: new Date().getTime(),
				action: Object.toJSON({action: 'RequestInfo', command: command})
			}
		});
	},
	requestInfoResponse: function (r)
	{
		this.doAlert("<table class='requestInfo'><tr><td><pre>" + r.response.join("\n").replace(/\</g, '&lt;').replace(/\>/g, '&gt;') + "</pre></td></tr></table>");
		_alert.cfg.setProperty("fixedcenter", false);
		_alert.cfg.setProperty("constraintoviewport", false);
	}
};
