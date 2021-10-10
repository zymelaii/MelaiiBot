"use strict";

const { getRp } = require('./jrrp');
const { rpStyles } = require('./rpstyle');
const { segment, cqcode } = require("oicq");

var selectedRpStyle = 'normal';
const toRpStyle = (num) =>
{
	return rpStyles[selectedRpStyle](num);
};

function listener_0(info)
{	//@message.group.normal
	//本月人品

	const bot = info.bot;
	const event = info.event;

	if (event.raw_message != '本月人品') return;

	const gid = event.group_id;
	const uid = event.user_id;

	let [year, month, day] = (new Date()
		.toLocaleDateString().split('/')).map((e) => Number(e));

	const days = [
		31, ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) ? 28 : 29),
		31, 30, 31, 30, 31, 31, 30, 31, 30];

	var rps = new Array(days[month - 1]);
	var aveRp = 0;
	for (let i = 1; i <= days[month - 1]; ++i)
	{
		rps[i - 1] = getRp(uid, year, month, i);
		aveRp += rps[i - 1];
	}
	aveRp = Math.floor(aveRp / days[month]);


	let best = Math.max(...rps);
	let worst = Math.min(...rps);

	let bestdays = [];
	let worstdays = [];

	rps.find((e, index) => {
		if (e == best) bestdays.push(index + 1);
		return false;
	})

	rps.find((e, index) => {
		if (e == worst) worstdays.push(index + 1);
		return false;
	})

	bestdays = bestdays.filter((e) => e >= day);
	worstdays = worstdays.filter((e) => e >= day);

	let text = cqcode.at(uid);
	switch (rps[day - 1])
	{
		case best:
			text += ' 哇，人品 ' + toRpStyle(best) + '，今天是你本月的良辰吉日呢！';
			text += '最适合氪金恋爱生猴子哦~'
		break;
		case worst:
			text += ' 噫，人品 ' + toRpStyle(worst) + '，今天是你本月的非洲度假日呢！';
			text += '别想着抽卡啦，好好休息吧！！';
		break;
		default:
			text += '\n◎今日人品：' + toRpStyle(rps[day - 1]);
			text += '\n◎本月平均人品：' + toRpStyle(aveRp);

			if (aveRp <= 0)
				text += '（噫，这个人脸好黑啊，梓言一定要离ta远远的）';
			else if (aveRp >= 72 && aveRp < 100)
				text += '（好腻害！想蹭蹭~）';
			else if (aveRp >= 100)
				text += '（哇，这就是传说中的天命之子吗？' + cqcode.face(318) + '）';

			text += '\n◎良辰吉日：';
			if (bestdays.length > 0)
				text += bestdays[0] + '号（人品：' + toRpStyle(best) + ' ）';
			else
				text += '哼哼，小女子夜观天象，发现阁下气数已尽，要不打赏打赏让梓言替你向天道老爷求求情？';

			text += '\n◎非洲度假日：'
			if (worstdays.length > 0)
				text += worstdays[0] + '号（人品：' + toRpStyle(worst) + ' ）';
			else
				text += '最坏的日子已经过去啦，努力摸鱼吧！';
	}

	bot.sendGroupMsg(gid, text);
}

function listener_1(info)
{	//@message.group.normal
	//本月人品参数管理

	const bot = info.bot;
	const event = info.event;
	const msg = info.msg;

	var index = msg.cmd.map(e => e.cmd).indexOf('jmrp');
	if (index == -1) return;	

	const argv = msg.cmd[index].argv;
	if (argv.length != 1) return;

	const gid = event.group_id;
	const uid = event.sender.user_id;

	const newStyle = argv[0];
	for (let key in rpStyles)
	{
		if (newStyle == key)
		{
			selectedRpStyle = newStyle;
			return;
		}
	}
}

const description =
{
	plugin: 'jrrp',
	actions: [{
		event: 'message.group.normal',
		subname: 'jmrp-exec',
		action: listener_0
	},{
		event: 'message.group.normal',
		subname: 'jmrp-man',
		action: listener_1
	}]
};

module.exports =
{
	description
};