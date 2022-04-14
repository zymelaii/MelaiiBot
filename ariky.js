"use strict";

const util   		= require('util');
const { CreateBot } = require('./lib/bot');
const utils  		= require('./lib/utils');
const plugin 		= require('./lib/plugin');
const permission    = require('./lib/permission');
const neapi 		= require('./plugins/music/netease_api');

const plugins = [ /*'default', 'p24',*/ 'music'/*, 'jrrp', 'nolp', 'multi'*/ ];

var bot = CreateBot(1745096608, { builtin: ['plugin'/*, 'env', 'permission'*/] });
bot.login('sec9623r78r');

bot.info('----------------');
bot.info('Package Version: MelaiiBot@1.5.3 (Released on 2021/10/28)');
bot.info('View README.md: https://github.com/ZYMelaii/MelaiiBot/blob/master/README.md');
bot.info('----------------');

bot.addListener('message', 'recv',
function (event) { //! 消息回显
	this.info(`[recv: ${event?.user_id}] ${event.raw_message}`);
	return true;
}, -1);

// bot.addListener('message', 'barriar',
// function (event) { //! 消息关卡
// 	let whitelist_user = [1745096608]; //! 访问白名单
// 	let whitelist_dev = this.getShared('DEV|DEBUG')?.ACTIVELIST ?? [];
// 	whitelist_user = whitelist_user.concat(whitelist_dev);
// 	return whitelist_user.includes(event.user_id);
// }, -1);

// bot.addListener('done', 'prof',
// function (event) { //! 事件处理完成报告
// 	if (event.scope == 'EventManager.emit')
// 	{
// 		bot.trace('EventManager.emit:',
// 			`done: [${event.event}]`,
// 			`cost time: ${event.cost}ms;`,
// 			`result: ${utils.coloredStringify(event.result)}`);
// 	}
// 	return true;
// });

bot.addListener('error', 'MelaiiBot@this._em',
function (e) { //! 错误汇报
	switch (e.scope)
	{
		case 'EventManager._call_multi':
			this.warn(`傻逼啊我他妈挂了！！！就因为${e.message}！我**你个**！！`);
		break;
		case 'DEV|DEBUG':
			this.error(`${e.scope}: ${e.from}: ${e.message}`);
		break;
	}
	
	return true;
});

// bot.addListener('plugin', 'barriar',
// function (event) { //! 插件关卡
// 	let result = true;
// 	if (event.post_type == 'message')
// 	{
// 		result = event.raw_message[0] == '.'
// 			|| ['本月人品', '骰子', '猜拳'].includes(event.raw_message);
// 	}
// 	return result;
// }, -1);

bot.addListener('system.online', 'MelaiiBot',
function (event) { //! 登录事件
	this.mark(`MelaiiBot@${this.uin} 已上线`);

	plugins.forEach((e) => { plugin.register(this, e, true); });
	this.info('环境列表：', this.envs);
	this.info('当前环境：', this.env);
	// this.info('分发列表：', Object.keys(this._dispatchers));
	// this.info('监听列表：', this.listener);
	this.info('插件列表：', this.plugins);

	return false;
}, -1);

bot.addListener('system.offline', 'MelaiiBot',
function (event) { //! 下线事件
	this.warn(`MelaiiBot@${this.uin} 异常掉线（${event.sub_type}）`);

	const Manager = this.getShared('hush-battle')?.Manager;
	if (Manager)
	{
		Manager.shutdown();
		this.info('Hush Battle 数据已保存');
	}

	this.plugins.forEach((e) => { plugin.unregister(this, e); });

	return false;
}, -1);

bot.addListener('notice.group.ban', 'MelaiiBot',
async function (event) { //! 禁言事件
	const gid      = event.group_id;
	const duration = event.duration;

	if (event.user_id == this.uin)
	{
		let members = await this.getGroupMemberList(gid);
		let op_nickname = members.get(event.operator_id).card;
		let group = this.groups.get(gid).group_name;
		if (duration > 0) this.warn(`MelaiiBot@${this.uin}被${op_nickname}禁言【${group}】`);
		else this.mark(`MelaiiBot@${this.uin}被${op_nickname}解除禁言【${group}】`);
	}

	return false;
});

/*
bot.addListener('message', 'DEV|DEBUG',
function (event) { //! 
	let field = this.getShared('DEV|DEBUG');
	if (field == null)
	{
		field = this.newShared('DEV|DEBUG');
		field.ACTIVELIST = [];
	}

	const gid = event?.group_id;
	const uid = event.sender.user_id;

	const process = { };

	function padd(uid)
	{
		field.ACTIVELIST.push(uid);
	}

	function pdel(uid)
	{
		let index = field.ACTIVELIST.indexOf(uid);
		if (index != -1)
		{
			field.ACTIVELIST.splice(index, 1);
		}
	}

	function pcls()
	{
		field.ACTIVELIST = [];
	}

	async function print(eles, cut = false)
	{
		let text;

		if (eles?.__proto__ == null)
		{
			text = 'null';
		} else if (eles.__proto__ == [].__proto__)
		{
			text = eles.map((e) =>
				typeof(e) == 'string' ? e : util.inspect(e)
			).join(' ');
		} else
		{
			text = util.inspect(eles);
		}

		if (text.length > 1024 && !cut)
		{
			event.reply('消息太长啦！');
		} else
		{
			const texts = text.match(/[\s\S]{1,1024}/g);
			texts.forEach((text) => {
				let tick = new Date().getTime();
				bot.sendMsg(text, { uid: uid, gid: gid });
				while (new Date().getTime() - tick < 3000);
			});
		}
	}

	const { parseMsg } = require('./lib/message');
	let msg = parseMsg(event.message, false).text.map((e) => e.text).join('');

	let predict = field.ACTIVELIST.indexOf(uid) != -1;
	let isroot  = uid == 1745096608;
	let case1   = (predict || isroot) && gid && gid == 783937534;
	let case2   = (predict || isroot) && !gid;
	let case3   = (predict || isroot) && msg.slice(0, 5) == '.sudo';

	if (!(case1 || case2 || case3)) return true;

	if (!isroot
		&& msg.indexOf('field.ACTIVELIST') != -1
		&& msg.indexOf('pdel') != -1
		&& msg.indexOf('padd') != -1
		&& msg.indexOf('pcls') != -1
		&& msg.indexOf('global.process') != -1) return true;

	let script = case3 ? msg.slice(5) : msg;
	try {
		this.info('debug-env: result:', eval(script));
		return false;
	} catch(e) {
		this.emit('error', {
			scope: 'DEV|DEBUG',
			message: e.message,
			from: script.trim()
		});
		return true;
	}
});
*/