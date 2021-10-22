"use strict";

const { getRp } = require('./jrrp');
const { getPhase, getRandomPhase } = require('./phase');
const { rpStyles } = require('./rpstyle');
const { segment, cqcode } = require("oicq");
const path = require('path');
const parser = require('../../lib/parser');
const { getRandom } = require('./jrrp');

function setup(field)
{
	field.selectedRpStyle = 'normal';
	field.toRpStyle = (num) => rpStyles[field.selectedRpStyle](num);
}

function listener_0(event)
{	//@message.group.normal
	//本月人品
	if (event.raw_message != '本月人品') return true;

	const gid = event.group_id;
	const uid = event.user_id;

	let date  = new Date();
	let year  = date.getFullYear();
	let month = date.getMonth() + 1;
	let day   = date.getDate();

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

	bestdays  = bestdays.filter((e) => e >= day);
	worstdays = worstdays.filter((e) => e >= day);

	const toRpStyle = this.getShared('jrrp').toRpStyle;

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
			let ave_msgex_id = 0;
			const ave_msgex = [
				'',
				'（噫，这个人脸好黑啊，梓言一定要离ta远远的）',
				'（好腻害！想蹭蹭~）',
				 '（哇，这就是传说中的天命之子吗？' + cqcode.face(318) + '）'
			];
			if (aveRp <= 0) ave_msgex_id = 1;
			else if (aveRp >= 72 && aveRp < 100) ave_msgex_id = 2;
			else if (aveRp >= 100) ave_msgex_id = 3;

			let is_good = bestdays.length > 0;
			let is_bad = worstdays.length > 0;

			text += '\n◎今日人品：' + toRpStyle(rps[day - 1]);

			if (is_good	|| is_bad)
			{
				text += '\n◎本月平均人品：' + toRpStyle(aveRp) + ave_msgex[ave_msgex_id];
				
				text += '\n◎良辰吉日：';
				if (is_good)
					text += bestdays[0] + '号（人品：' + toRpStyle(best) + ' ）';
				else
					text += '哼哼，小女子夜观天象，发现阁下气数已尽，要不打赏打赏让梓言替你向天道老爷求求情？';
				
				text += '\n◎非洲度假日：'
				if (is_bad)
					text += worstdays[0] + '号（人品：' + toRpStyle(worst) + ' ）';
				else
					text += '最坏的日子已经过去啦，努力摸鱼吧！';
			} else
			{
				text += '，接下来的日子平平淡淡啦~';
			}
		break;
	}

	this.sendGroupMsg(gid, text);

	return false;
}

async function listener_1(event)
{	//@message.group.normal
	//本月人品参数管理
	const gid = event.group_id;
	const uid = event.user_id;

	if (event.raw_message[0] != '.') return true;
	let raw_cmd = event.raw_message.slice(1);

	return await parser.execute(raw_cmd, parser.getdesctemp('jmrp'),
	(subcmds, argeles, freewords) => {
		let field = this.getShared('jrrp');
		let possibleStyle = freewords.map((e) => e.word);
		for (let i = 0; i < possibleStyle; ++i)
		{
			let style = possibleStyle[i];
			for (let key in rpStyles)
			{
				if (style == key)
				{
					field.selectedRpStyle = style;
					return;
				}
			}
		}
		return false;
	}).catch((e) => {
		this.error('plugin.jrrp.jmrp-man:', e.message);
		return true;
	}) ?? true;
}

async function listener_2(event)
{	//@message.group.normal
	//今日卦象
	const gid   = event.group_id;
	const uid   = event.user_id;

	if (event.raw_message[0] != '.') return true;
	const raw_cmd = event.raw_message.slice(1);

	return await parser.execute(raw_cmd, parser.getdesctemp('jrphase'),
	(subcmds, argeles, freewords) => {
		const date  = new Date();
		const seed = uid + [date.getFullYear(),
			date.getMonth() + 1, date.getDate()].join('/');
		const phaseIndex = getRandom(seed, 1, 64);
		const phase = getPhase(phaseIndex);
	
		if (!phase)
		{
			console.error('[ERROR] plugin.jrrp.jrphase: unknown error');
			this.sendGroupMsg(gid, '嗯~本姑娘今天状态不好，算不出卦了……才不是骗人的呢！');
			return;
		}
	
		const phaseReply = cqcode.at(uid) + cqcode.image(
			path.resolve(__dirname, `assets/phases/phase-${phaseIndex}.gif`))
			+ `今日的卦象为${phase.phase}\n${phase.description}`;

		this.sendGroupMsg(gid, phaseReply);
		return false;
	}).catch((e) => {
		this.error('plugin.jrrp.jrphase:', e.message);
		return true;
	}) ?? true;
}

const description =
{
	plugin: 'jrrp',
	setup: setup,
	actions: [{
		event: 'message.group.normal',
		subname: 'jmrp-exec',
		action: listener_0
	},{
		event: 'message.group.normal',
		subname: 'jmrp-man',
		action: listener_1
	},{
		event: 'message.group.normal',
		subname: 'jrphase',
		action: listener_2
	}]
};

module.exports =
{
	description
};