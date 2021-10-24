"use strict";

// const { Client } = require('./oicq/lib/oicq');
const { createClient } = require('./oicq'); //! modified
const { getGroupMsgs } = require('./oicq/lib/message/history');
const { parseGroupMsg, Parser } = require('./oicq/lib/message/parser');
const { unzip } = require('./oicq/lib/common');
const pb = require("./oicq/lib/algo/pb");

const utils = require('./utils');
const { EventManager } = require('./event');
const plugin = require('./plugin');
const { parseMsg } = require('./message');
const { clone } = require('lodash');

// const EventMap =
// [	//! OICQ 事件列表
// 	'system.login.qrcode',    'system.login.slider',    'system.login.device',     'system.login.error',
// 	'system.login',           'system.online',          'system.offline.kickoff',  'system.offline.frozen',
// 	'system.offline.unknown', 'system.offline',         'request.friend.single',   'request.friend',
// 	'request.group.add',      'request.group.invite',   'request.group',           'request',
// 	'message.private.group',  'message.private.single', 'message.private.other',   'message.private.self',
// 	'message.private',        'message.group.normal',   'message.group.anonymous', 'message.discuss',
// 	'message',                'notice.friend.decrease', 'notice.friend.recall',    'notice.friend.profile',
// 	'notice.friend.poke',     'notice.group.increase',  'notice.group.decrease',   'notice.group.recall',
// 	'notice.group.admin',     'notice.group.ban',       'notice.group.transfer',   'notice.group.title',
// 	'notice.group.poke',      'notice.group.setting',   'notice.friend',           'notice.group',
// 	'notice',                 'sync.profile',           'sync.status',             'sync.black',
// 	'sync.readed',            'sync.readed.private',    'sync.readed.group',       'sync',
// 	'internal.input',         'internal.kickoff',       'internal.network',        'internal.sso',
// 	'internal.offline',       'internal.packet',        'internal'
// ];

class MelaiiBot
{
	/// MelaiiBot Members
	//! @QQBot:
	//!     - _client: Client OICQ客户端
	//! @Environment:
	//!     - _em: EventManager 事件管理器
	//!     - _current_env: String 当前Bot环境
	//!     - _builtin: Array<String> 预置的插件列表，在环境创建时自动安装
	//! @Status:
	//!     - _sleep: Boolean 睡眠状态标志
	//! @Shared Field:
	//!     - _sharedfield: Map<Any> 共享变量域
	//!         包括但不限于创建与Bot绑定的插件内存空间
	//! @Unused:
	///     - _counter: Integer 缺省计数变量

	_client;

	_em;
	_current_env;

	_sleep;
	_builtin;

	_sharedfield;
	_counter;

	/// MelaiiBot Methods
	//! @QQBot:
	//!     - login(password: String) -> void 登录
	//!     - sendPrivateMsg(uid: Integer, msg: String) -> Map<Any> 发送私人消息
	//!     - sendGroupMsgSafe(gid: Integer, msg: String) -> Map<Any> 安全地发送群消息（分段发送）
	//!     - sendGroupMsg(gid: Integer, msg: String) -> Map<Any> 发送群消息
	//!     - sendMsg(msg: String, target: Map<Integer>) -> Map<Any> 发送消息（自动推断私聊或群聊）
	//!     - withdrawMessage(messageid: String) -> Map<Any> 撤回消息
	//!     - getGroupMemberList(gid: Integer, no_cache: Boolean) -> Map<Any> 获取群成员信息列表
	//! 	- pickGroupMsg(gid: Integer, seq: Integer) -> Map<Any> 获取历史群消息
	//!     - get uin() -> Integer 当前登录账户
	//!     - get friends() -> Map<Map<Any>> 好友列表
	//!     - get groups() -> Map<Map<Any>> 群列表
	//! @Status:
	//!     - get sleep() -> Boolean 睡眠状态
	//! @Environment:
	//!     - newEnvironment(env: String, no_builtin: Boolean) -> MelaiiBot<this> 新建环境
	//!     - switchTo(env: String, force: Boolean) -> MelaiiBot<this> 切换环境
	//!     - get env() -> String 当前环境
	//!     - get envs() -> Array<String> 环境列表
	//!     - set env(env: String) 切换环境
	//! @Event:
	//!     - emit(signal: String, data: Any) -> MelaiiBot<this> 发送信号（产生事件）
	//!     - addListener(_event: String, name: String, action: Function, priority: Integer) -> MelaiiBot<this> 添加监听单元
	//!     - delListener(_event: String, name: String) -> MelaiiBot<this> 注销监听单元
	//! 	- get em() -> EventManager 当前事件管理器
	//! @Plugin:
	//!     - registerPlugin(desc: Map<Any>) -> MelaiiBot<this> 注册插件
	//!     - unregisterPlugin(plugin: String, force: Boolean) -> Integer 移除插件
	//!     - get plugins() -> Array<String> 当前插件列表
	//! @Shared Field:
	//!     - newShared(field: String) -> Map<Any> 新建共享域
	//!     - delShared(field: String) -> void 删除共享域
	//!     - getShared(field: String) -> Map<Any> 获取共享域
	//! @Logger:
	//!     - trace(...) -> MelaiiBot<this> 跟踪日志
	//!     - mark(...) -> MelaiiBot<this> 标记日志
	//!     - info(...) -> MelaiiBot<this> 信息日志
	//!     - warn(...) -> MelaiiBot<this> 警告日志
	///     - error(...) -> MelaiiBot<this> 错误日志

	//@ param: config: { OICQ::BotConf..., builtin: [Plugins...] }
	constructor(uin, config = null)
	{
		this._client = createClient(uin, {
			ignore_self: config?.ignore_self ?? false, //! 默认接受自己的消息
			log_level:   config?.log_level ?? 'off',   //! 默认不输出日志
			platform:    config?.platform ?? 5         //! 默认登录iPad平台
		});

		this._current_env = null;
		this._em = {};

		this._sleep = false; //! 睡眠状态（未实现）

		this._builtin = config?.builtin ?? []; //! 核心插件（默认安装）

		//! 风控机制
		//! 风控触发将强制截断群消息为风险模式的最大长度
		//! 消息截断将尽可能的保证消息的完整性
		//! NOTE: 该项为可选的配置，自行在风控事件中处理
		this._on_riskctrl     = false;
		this._riskctrl_count  = 0;
		this._max_msglen_risk = 100;

		this._max_groupmsg_len = 1024; //! 最大群消息长度，超过将截断消息
		this._cut_style = 0; //! 截断形式，0为直接截断，1为按行截断，2为按行截断并分段发送

		this._sharedfield = {};

		this._client.on('MelaiiBot@__ALL__', async (data) => {
			let event     = data.name;
			let eventData = data.data;
			this.emit(event, eventData);
		}); //! 库源码改动于oicq/lib/client-ext.js@Client.prototype.em
			//! 转发所有em触发的原事件

		this._counter = 0;
	}

	/// 自定义事件 system.riskctrl
	//! @note: 二次增添于 oicq/lib/message/builder.js oicq/lib/client.js
	//! @note: event = {
	//!     status: true | false,
	//!     time: Integer<new Date().getTime()>
	//!     message_id: String<Base64>
	/// }

	get uin()      { return this._client.uin; }
	get friends()  { return this._client.fl; }
	get groups()   { return this._client.gl; }
	get sleep()    { return this._sleep; }
	get env()      { return this._current_env; }
	get envs()     { return Object.keys(this._em); }
	get em()       { return this._em[this._current_env]; }

	get plugins()
	{
		let em = this.em;
		if (em == null) return [];
		return Object.keys(em._find_event_domain('plugin')?.domains ?? []);
	}

	set env(env)
	{
		this.switchTo(env, false);
	}

	newEnvironment(env, no_builtin = false)
	{
		if (!Object.keys(this._em).includes(env))
		{
			this._em[env] = new EventManager;
			if (!no_builtin)
			{
				let oldenv = this._current_env;
				this._current_env = env;
				this._builtin.forEach((e) => {
					let resp = plugin.register(this, e);
					if (resp.status_code != 0)
					{
						this.warn('MelaiiBot@newEnvironment:',
							`failed installing plugin "${e}" while creating env "${env}" (${resp.errmsg})`);
					}
				});
				this._current_env = oldenv;
			}
		}

		return this;
	}

	switchTo(env, force = false)
	{
		if (this._current_env == env) return this;

		if (Object.keys(this._em).includes(env))
		{   //! 转换环境
			this._current_env = env;
		} else if (force)
		{   //! 环境不存在，创建新环境
			this.newEnvironment(env);
			this._current_env = env;
		}

		return this;
	}

	async emit(event, data = null, extra = null)
	{
		if (extra == null) extra = { context: this };
		if (extra?.context == null) extra.context = this;
		let em = this.em;
		if (em != null)
		{
			return await em.emit(event, data, extra);
		}
		return null;
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

	clearRiskControl()
	{
		while (this.riskctrl)
		{
			this.riskctrl = false;
		}
	}

	//! 添加监听单元
	addListener(_event, name, action, priority = 3)
	{
		let em = this.em;
		if (em != null)
		{
			em.addListener(_event, name, action, priority);
		}
		return this;
	}

	//! 删除监听单元
	delListener(_event, name = null)
	{
		let em = this.em;
		if (em != null)
		{
			em.delListener(_event, name);
		}
		return this;
	}

	/// 从描述档案注册插件
	//! @param: desc: { plugin: str, actions: [{
	///     event: event, subname: str, action: function },...] }
	registerPlugin(desc)
	{
		if (this.em == null) return this;

		desc.actions.forEach((e) => {
			let plugin_node = `${desc.plugin}.${e.subname}`;
			this.addListener(e.event, `transfer.${plugin_node}`,
			async (event) => { //! 包装并转发插件响应事件
				let eventData = clone(event);
				eventData.plugin = desc.plugin;
				eventData.sub_plugin = e.subname;
				let resp = await this.emit(`plugin.${plugin_node}`, eventData);
				return !resp.break;
				// return true;
			});
			this.addListener(`plugin.${plugin_node}`, e.subname, e.action);
		});

		let shared = this.newShared(desc.plugin); //! 创建插件的共享内存域
		if (desc?.setup) desc.setup.call(this, shared);

		return this;
	}

	/// MelaiiBot::unregisterPlugin
	//! @intro: 卸载插件
	//! @param: plugin: String 插件名称
	/// @return: 卸载的插件节点总数，卸载失败时返回-1
	unregisterPlugin(_plugin, force = false)
	{
		if (this.em == null) return -1;

		let removed = 0, desc = null;
		plugin.transfer(_plugin, (e) => { desc = e; });
		if (!desc) return -1;

		if (!(this._builtin.includes(_plugin) && !force))
		{
			if (!this.em.removeEvent(`plugin.${desc.plugin}`)) return -1;
			desc.actions.forEach((e) => {
				let result = this.delListener(
					e.event, `transfer.${desc.plugin}.${e.subname}`);
				if (result) ++removed;
			});
			if (desc?.uninstall) desc.uninstall.call(this);
			this.delShared(_plugin);
		} else
		{
			this.error(`MelaiiBot@unregisterPlugin:`,
				`attemp to unregister builtin plugin "${_plugin}" without force flag`);
			removed = -1;
		}

		return removed;
	}

	login(password)
	{
		if (password)
		{
			this._client.login(password);
		} else
		{
			this._client.once("system.login.qrcode", (event) => {
				process.stdin.once("data", () => {
					this._client.login();
				});
			}).login();
		}
		return this;
	}

	makeGroupMsgSegments(msg)
	{
		if (this._cut_style == 0)
		{	//! 直接截断
			return [msg.slice(0, this._max_groupmsg_len)];
		}

		let msgpiece = msg.split('\n');
		let safe_msgs = [];
		let cursor = 0, piece_at = 0;

		let tmp_msg = '';
		while (piece_at < msgpiece.length)
		{
			if (cursor + msgpiece[piece_at].length
				< this._max_groupmsg_len * 1.1)
			{
				tmp_msg += '\n' + msgpiece[piece_at++];
				cursor = tmp_msg.length;
			} else
			{
				if (msgpiece[piece_at].length > this._max_groupmsg_len)
				{	//! 无法再形成独立的一行，强行截断
					tmp_msg += '\n' + msgpiece[piece_at]
						.slice(0, this._max_groupmsg_len - cursor);
					msgpiece[piece_at] = msgpiece[piece_at]
						.slice(this._max_groupmsg_len - cursor);
				}
				safe_msgs.push(tmp_msg.trim());
				tmp_msg = '';
				cursor = 0;
			}
			if (safe_msgs.length == 1 && this._cut_style == 1)
			{	//! 截断一行
				break;
			}
		}

		return safe_msgs;
	}

	async sendGroupMsgSafe(gid, msg)
	{
		let msg_segments = this.makeGroupMsgSegments(msg);
		let last_result = null;
		for (let i = 0; i < msg_segments.length; ++i)
		{
			let msg_segment = msg_segments[i];
			last_result = await this._client.sendGroupMsg(gid, msg_segment);
		}
		return last_result;
	}

	async sendMsg(msg, target)
	{
		const uid = target?.uid;
		const gid = target?.gid;

		if (!uid && !gid) return null;

		while (msg = msg.replace('\r', '\n'), msg.indexOf('\r') != -1);

		if (msg.length > 1024)
		{
			this.warn('MelaiiBot@sendMsg: msg too long (longer than 1024)');
			return null;
		}

		let resp = gid
			? await this.sendGroupMsgSafe(gid, msg)
			: await this._client.sendPrivateMsg(uid, msg);

		if (resp?.data?.riskctrl != null)
		{
			this.emit('system.riskctrl', {
				post_type:   'system',
				system_type: 'riskctrl',
				status:      resp?.data?.riskctrl,
				time:        new Date().getTime(),
				message_id:  resp?.data?.message_id
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
		let resp = await this._client.getGroupMemberList(gid, no_cache);
		return resp?.data;
	}

	async pickGroupMsg(gid, seq)
	{
		let pb_body = pb.encode({ 1: gid, 2: seq/*from_seq*/, 3: seq/*to_seq*/, 6: 0 });
		let blob;

		try {
			blob = await this._client.sendUni("MessageSvc.PbGetGroupMsg", pb_body);
		} catch(e) {
			this.error(e.message);
			return { status: -1, err: e.message }; //! 未知错误1
		}

		let o = pb.decode(blob);
		if (o[1] > 0) return { status: 1, err: '消息获取失败' };

		let raw_msg = o[6];/*Array.isArray(o[6]) ? o[6] : [o[6]]*/;
		const head = raw_msg[1], content = raw_msg[2], body = raw_msg[3];

		let time = head[6];

		let user_id = head[1], group_id = head[9][1];
		let rich  = body[1];

		let elems = rich[2];

		if (!Array.isArray(elems) && elems[1][1] == '[已删除]')
		{
			return { status: 2, err: '消息已撤回' };
		}

		let parser;
		try {
			parser = await Parser.invoke(this._client, user_id, group_id, rich);
		} catch(e) {
			return { status: -2, err: e.message }; //! 未知错误2
		}

		parser.time = time; //! 获取真实时间 new Date(time * 1000)

		return { status: 0, data: parser };
	}

	//! logger
	trace()
	{
		console.log(
			`\x1b[34m[${new Date().toISOString()}] [TRACE]\x1b[0m -`,
			...arguments);
		return this;
	}

	info()
	{
		console.log(
			`\x1b[37m[${new Date().toISOString()}] [INFO]\x1b[0m -`,
			...arguments);
		return this;
	}

	mark()
	{
		console.warn(
			`\x1b[36m[${new Date().toISOString()}] [MARK]\x1b[0m -`,
			...arguments);
		return this;
	}

	warn()
	{
		console.warn(
			`\x1b[33m[${new Date().toISOString()}] [WARN]\x1b[0m -`,
			...arguments);
		return this;
	}

	error()
	{
		console.error(
			`\x1b[31m[${new Date().toISOString()}] [ERROR]\x1b[0m -`,
			...arguments);
		return this;
	}
};

function CreateBot(account, config) {
	let bot = new MelaiiBot(account, config);
	return bot.switchTo('normal', true);
}

module.exports =
{
	MelaiiBot,
	CreateBot
};