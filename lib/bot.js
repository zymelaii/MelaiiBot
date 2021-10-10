"use strict";

const { createClient } = require('oicq');
const { Client } = require('oicq/lib/oicq');
const { cloneDeep } = require('lodash');
const { parseMsg } = require('./message');

class MelaiiBot
{
	// _client: Client;

	// _listener = {};
	// event: { name: action, ... }

	//status
	//_sleep: boolean
	//_env: str

	constructor(uin, config)
	{
		this._client = createClient(uin, config);
	
		this._listener = {};

		this._sleep  = false;
		this._env    = 'normal';

		this._counter = 0;
	}

	get uin()
	{
		return this._client.uin;
	}

	get sleep()
	{
		return this._sleep;
	}

	get env()
	{
		return this._env;
	}

	/********************************
	 *  @author: ZYmelaii
	 *
	 *  @action: callback function
	 *
	 *  @brief: function action({ bot: MelaiiBot, event: EventData })
	 *
	 *  @NOTES: 
	 *******************************/

	addListener(_event, name, action)
	{
		if (this._listener[_event] == null)
		{
			this._listener[_event] = {}

			this._client.on(_event, (event) => {
				var actions = this._listener[_event];
				const msg = parseMsg(event.message);
				for (var key in actions)
				{
					try {
						var shouldContinue = actions[key]({
							bot: this, event: event, msg: msg
						});
						if (shouldContinue == null) shouldContinue = true;
						if (!shouldContinue) break;
					} catch(exception) {
						console.log('[ERROR] failed call action `%s` of %s (%s)',
							key, _event, exception.message);
					}
				}
			});
		}

		this._listener[_event][name] = action;
	}

	delListener(event, name)
	{
		if (this._listener[event] != null)
		{
			if (this._listener[event][name] != null)
			{
				delete this._listener[event][name];
			}

			if (Object.keys(this._listener[event]).length == 0)
			{
				this._client.off(event);
			}
		}
	}

	registerPlugin(desc)
	{
		/** 
		 *  desc = {
		 *    plugin: str,
		 *    actions: [{ event: event, subname: str, action: function }...]
		 *  };
		 **/
		var root = desc.plugin;
		for (var i = 0; i < desc.actions.length; ++i)
		{
			var e = desc.actions[i];
			this.addListener(e.event, '#' + root + '.' + e.subname, e.action);
		}
	}

	unregisterPlugin(plugin)
	{
		for (var k1 in this._listener)
		{
			for (var k2 in this._listener[k1])
			{
				if (this._listener[k1][k2].indexOf('#' + plugin) == 0)
				{
					delete this._listener[k1][k2];
				}
			}
			this.delListener(k1, null);
		}
	}

	login(password)
	{
		this._client.login(password);
	}

	async sendPrivateMsg(uid, msg)
	{
		return await this._client.sendPrivateMsg(uid, msg);
	}

	async sendGroupMsg(gid, msg)
	{
		return await this._client.sendGroupMsg(gid, msg);
	}

	async withdrawMessage(messageid)
	{
		return await this._client.deleteMsg(messageid);
	}
};

module.exports =
{
	MelaiiBot
};
