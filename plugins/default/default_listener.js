"use strict";

const { segment, cqcode } = require("oicq");

function listener_0(info)
{	//@notice.group.poke
	const bot = info.bot;
	const event = info.event;
	const tid = event.target_id;
	const gid = event.group_id;

	if (tid == bot.uin)
	{
		bot.sendGroupMsg(gid, 'o(>﹏<)o不要啊~');
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