"use strict";

const { segment, cqcode } = require("oicq");
const utils = require('../../lib/utils');

function setup(bot, field)
{
	/// plugin.default.poke-response
	//! @attribute: pokeCounts: Map<Integer->Integer>
	//! 	每个群持有一个戳一戳计数
	//! 	初始计数为0，上限计数为8
	//! 	当超过上限计数时，计数将被重置为-1且该动作进入休眠状态
	//! 	休眠状态结束后，计数重置为0
	field.pokeCounts = { /*gid: count*/ };
	field.pokeWords = [
		'o(>﹏<)o不要啊~',
		'嗷呜~',
		'嗷呜~（你想干什么！',
		'嗷呜~（咬你奥，说真的！',
		'嗷呜~（好舒服……',
		'嗷呜~（滚！',
		'嗯？有什么事吗。'
	];
}

function listener_0(info)
{	//@notice.group.poke
	const bot = info.bot;
	const event = info.event;
	const tid = event.target_id;
	const gid = event.group_id;

	if (tid == bot.uin)
	{
		let field = bot.getShared('default');
		let pokeCounts = field.pokeCounts;

		if (!(gid in pokeCounts)) pokeCounts[gid] = 0;
		else if (pokeCounts[gid] == -1) return;

		if (++pokeCounts[gid] > 8)
		{
			bot.sendGroupMsg(gid, '哼，大坏蛋，不理你们了！');
			pokeCounts[gid] = -1;
			//! 执行十分钟休眠
			setTimeout(() => { pokeCounts[gid] = 0; }, 10 * 60 * 1000);
		} else
		{
			const pokeWords = field.pokeWords;
			bot.sendGroupMsg(gid, pokeWords[utils.randomInt(0, pokeWords.length - 1)]);
		}
	}
}

function listener_1(info)
{	//@message.group.normal
	//猜拳
	const bot = info.bot;
	const event = info.event;
	const gid = event.group_id;

	if (event.raw_message == '猜拳')
	{
		bot.sendGroupMsg(gid, cqcode.rps(Math.floor(Math.random() * 3) + 1));
	}
}

function listener_2(info)
{	//@message.group.normal
	//骰子
	const bot = info.bot;
	const event = info.event;
	const gid = event.group_id;

	if (event.raw_message == '骰子')
	{
		bot.sendGroupMsg(gid, cqcode.dice(Math.floor(Math.random() * 6) + 1));
	}
}

function listener_3(info)
{	//@message.group.normal
	//网易云音乐点歌
	const bot = info.bot;
	const event = info.event;
	const gid = event.group_id;

	let words = event.raw_message.trim().split(' ').filter(e => e != '');

	if (words[0] != '网易云点歌') return;

	if (isNaN(Number(words[1]))) return;
	bot.sendGroupMsg(gid, cqcode.music('163', words[1]));
}

function listener_4(info)
{	//@message.group.normal
	//send指令
	const bot = info.bot;
	const event = info.event;
	const msg = info.msg;

	var index = msg.cmd.map(e => e.cmd).indexOf('send');
	if (index == -1) return;

	const gid = event.group_id;

	var argv = msg.cmd[index].argv;
	bot.sendGroupMsg(gid, argv.join(' '));
}

function listener_5(info)
{	//@message
	//help指令
	const bot = info.bot;
	const event = info.event;
	const msg = info.msg;

	var index = msg.cmd.map(e => e.cmd).indexOf('help');
	if (index == -1) return;

	const gid = event.group_id;
	const uid = event.user_id;

	const helpinfo =
		'梓言的n种使用方法（害羞o(*////▽////*)q\n' +
		'\t.help: 梓言亲自教你怎么玩我哦~\n' +
		'\t.send <msg...>: 强……强迫梓言说话！\n' +
		'\t.p24 <target=24> [--skip|--force] 来一局精彩刺激的24点游戏吧！\n' +
		'\t.music [search|play] <args...> 嗨歌吗？跟梓言一起吧！\n' +
		'\t猜拳: 就是猜拳啦~\n' +
		'\t骰子: 就是投骰子啦~';

	if (gid == null)
	{
		bot.sendPrivateMsg(uid, helpinfo);
	} else
	{
		bot.sendGroupMsg(gid, helpinfo);
	}
}

function listener_6(info)
{	//@message.group.normal
	//sendpulse指令
	const bot = info.bot;
	const event = info.event;
	const msg = info.msg;

	var index = msg.cmd.map(e => e.cmd).indexOf('sendpulse');
	if (index == -1) return;

	const gid = event.group_id;
	const uid = event.sender.user_id;
	if (uid == event.self_id) bot.withdrawMessage(event.message_id);

	var argv = msg.cmd[index].argv;

	bot.sendGroupMsg(gid, argv.join(' ')).then((response) => {
		bot.withdrawMessage(response.data.message_id);
	});
}

const description =
{
	plugin: 'default',
	setup: setup,
	actions: [{
		event: 'notice.group.poke',
		subname: 'poke-response',
		action: listener_0
	},{
		event: 'message.group.normal',
		subname: 'rps',
		action: listener_1
	},{
		event: 'message.group.normal',
		subname: 'dice',
		action: listener_2
	},/*{
		event: 'message.group.normal',
		subname: 'cloudease-song',
		action: listener_3
	},*/{
		event: 'message.group.normal',
		subname: 'cmd-send',
		action: listener_4
	},{
		event: 'message',
		subname: 'cmd-help',
		action: listener_5
	},{
		event: 'message',
		subname: 'cmd-sendpulse',
		action: listener_6
	}]
};

module.exports =
{
	description
};