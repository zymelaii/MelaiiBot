"use strict";

const { createClient } = require('./oicq');
// const { Client } = require('./oicq/lib/oicq');
const { cloneDeep } = require('lodash');
const { parseMsg } = require('./message');

class MelaiiBot
{
	// _client: Client;

	// _current_env: str
	// _environments: { envname: listener: { _: dispatcher, ... } }

	// event: { name: action, ... }

	// status
	// _sleep: boolean
	// _env: str

	// _sharedfield: { field: data, ... } 公有内存域

	constructor(uin, config)
	{
		this._client = createClient(uin, config);
	
		this._current_env  = 'normal';
		this._environments = {};
		this._environments[this._current_env] = {};

		this._sleep           = false;

		//! 风控机制
		//! 风控触发将强制截断群消息为风险模式的最大长度
		//! 消息截断将尽可能的保证消息的完整性
		this._on_riskctrl     = false;
		this._max_msglen_risk = 100;
		this._riskctrl_count  = 0;

		this._sharedfield = {};

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

	get riskctrl()
	{
		return this._on_riskctrl;
	}

	get env()
	{
		return this._current_env;
	}

	get listener()
	{
		return this._environments[this._current_env];
	}

	get plugins()
	{
		let actors = [];
		for (let event in this.listener)
		{
			for (let e in this.listener[event])
			{
				if (e[0] != '#') continue;
				let results = e.match(/#(.*?)\./);
				if (results.length >= 2) actors.push(results[1]);
			}
		}
		return [...new Set(actors)];
	}

	set riskctrl(status)
	{
		if (!status && this._riskctrl_count != 0)
		{
			if (this._riskctrl_count > 0) --this._riskctrl_count;
			if (this._riskctrl_count < 0)
				throw new Error('MelaiiBot: unexpected riskctrl flag');
			if (this._riskctrl_count == 0)
			{
				this._on_riskctrl = false;
				console.log('[INFO] MelaiiBot: cleared risk control flag');
			}
		} else
		{
			if (this._riskctrl_count == 0) this._on_riskctrl = true;
			++this._riskctrl_count;
			setTimeout(() => {
				this.riskctrl = false;
			}, 10 * 60 * 1000); //! 启用10分钟的风控限制
			console.log(`[INFO] MelaiiBot: set risk control flag [${this._riskctrl_count}]`);
		}
	}

	set env(env)
	{
		if (this._current_env != env)
		{
			if (Object.keys(
				this._environments).indexOf(env) != -1)
			{
				this._current_env = env;
			}
		}
	}

	emit(signal, data = null)
	{
		this._client.emit(signal, data);
	}

	newShared(field)
	{
		this._sharedfield[field] = new Map();
		return this._sharedfield[field];
	}

	delShared(field)
	{
		if (this._sharedfield[field])
		{
			delete this._sharedfield[field];
		}
	}

	getShared(field)
	{
		return this._sharedfield[field];
	}

	switchTo(env)
	{
		let tmp = this._current_env;
		this.env = env;
		return tmp != this._current_env;
	}

	clearRiskControl()
	{
	 	while (this.riskctrl)
	 	{
	 		this.riskctrl = false;
	 	}
	}

	/// 添加监听器
	//! @author: ZYmelaii
	//! @param: action: function({ bot: MelaiiBot, event: EventData })
	///
	addListener(_event, name, action)
	{
		let listener = this.listener;

		if (name == '_')
		{
			console.warn('[WARN] MelaiiBot: addListener reject listener named "_"');
			return;
		}

		if (listener[_event] == null)
		{
			listener[_event] = {}
			listener[_event]._ = //! dispatcher
			(event) => {
				let actions = listener[_event];
				const msg = parseMsg(event.message);
				for (let key in actions)
				{
					if (key == '_') continue;

					let shouldContinue;
					try {
						shouldContinue = actions[key]({
							bot: this, event: event, msg: msg
						});
					} catch(e) {
						console.error(`[ERROR] failed call action "${key}" of ${_event} (${e.message})`);
					}

					if (shouldContinue == null) shouldContinue = true;
					if (!shouldContinue) break;
				}
			};

			this._client.on(_event, listener[_event]._);
		}

		listener[_event][name] = action;
	}

	//! 删除监听器
	delListener(event, name)
	{
		let listener = this.listener;

		if (name == '_')
		{
			console.warn('[WARN] MelaiiBot: delListener reject listener named "_"');
			return;
		}

		if (listener[event] != null)
		{
			if (listener[event][name] != null)
			{
				delete listener[event][name];
			}

			if (Object.keys(listener[event]).length == 1)
			{
				this._client.off(event, listener[event]._);
				delete listener[event];
			}
		}
	}

	/// 从描述档案注册插件
	//! @param: desc: { plugin: str, actions: [{
	//! 	event: event, subname: str, action: function },...] }
	///
	registerPlugin(desc)
	{
		let root = desc.plugin;

		desc.actions.forEach((e) => {
			this.addListener(e.event, `#${root}.${e.subname}`, e.action);
		});

		let shared = this.newShared(root); //! 创建插件的共享内存域
		if (desc?.setup) desc.setup(bot, shared);
	}

	/// MelaiiBot::unregisterPlugin
	//! @intro: 卸载插件
	//! @param: plugin: String 插件名称
	//! @return: 卸载的插件节点总数
	///
	unregisterPlugin(plugin)
	{
		let removed = 0;

		let events = Object.keys(this.listener);
		events.forEach((event) => {
			let names = Object.keys(this.listener[event]);
			names.forEach((name) => {
				if (name.indexOf(`#${plugin}`) == 0)
				{
					this.delListener(event, name);
					++removed;
				}
			});
		});

		this.delShared(plugin);
		return removed;
	}

	login(password)
	{
		this._client.login(password);
	}

	makeRiskctrlMsg(msg)
	{
		let msgpiece = msg.split('\n');
		let newmsg = '';
		if (msgpiece.length == 1
			|| msgpiece[0].length > this._max_msglen_risk)
		{
			newmsg = msg.slice(0, this._max_msglen_risk);
		} else
		{
			for (let i in msgpiece)
			{
				let tmp = `${newmsg}\n${msgpiece[i]}`;
				if (tmp.length > this._max_msglen_risk) break;
				newmsg = tmp;
			}
		}
		return `[风控] ${newmsg}`;
	}

	async sendGroupMsgSafe(gid, msg)
	{
		if (this.riskctrl) msg = this.makeRiskctrlMsg(msg);
		let result = await this._client.sendGroupMsg(gid, msg);
		return result;
	}

	async sendMsg(msg, target)
	{
		const uid = target?.uid;
		const gid = target?.gid;

		if (!uid && !gid) return null;

		while (msg = msg.replace('\r', '\n'), msg.indexOf('\r') != -1);

		if (msg.length > 1024)
		{
			console.log('[WARN] MelaiiBot@MelaiiBot.sendMsg: msg too long (longer than 1024)');
			return null;
		}

		let resp = gid
			? await this.sendGroupMsgSafe(gid, msg)
			: await this._client.sendPrivateMsg(uid, msg);

		if (resp?.data?.riskctrl != null)
		{
			this.emit('system.riskctrl', {
				status: resp?.data?.riskctrl,
				time: new Date().getTime(),
				message_id: resp?.data?.message_id
			});
		}

		return resp;
	}

	async sendPrivateMsg(uid, msg)
	{
		return await this.sendMsg(msg, { uid: uid });
	}

	async sendGroupMsg(gid, msg)
	{
		return await this.sendMsg(msg, { gid: gid });
	}

	async withdrawMessage(messageid)
	{
		return await this._client.deleteMsg(messageid);
	}

	async getGroupMemberList(gid, no_cache = false)
	{
		return await this._client.getGroupMemberList(gid, no_cache);
	}

};

module.exports =
{
	MelaiiBot
};
