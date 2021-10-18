"use strict";

const { MelaiiBot } = require('../../lib/bot');
const parser = require('../../lib/parser');
const { loadFileAsJson } = require('../../lib/filesys');
const { cqcode } = require('oicq');
const path = require('path');
const p24 = require('./p24');

const cmdDesc = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, 'p24.json'))
);

async function performCreate(info, createData)
{
	const bot    = info.bot;
	const gid    = info.event.group_id;
	const uid    = info.event.sender.user_id;
	const force  = createData.force;
	var   target = createData.target;

	var resp = force ? p24.forceCreate24Game(gid, uid, target)
		: p24.tryCreate24Game(gid, uid, target);

	var p24info = p24.get24GameInfo(gid);

	switch (resp.status.code)
	{
		case 1:
		{
			bot.sendGroupMsg(gid, '游戏正在进行中哦！试试从['
				+ p24info.numbers.join(',') + ']得到'
				+ String(p24info.target) + '吧！');
		}
		break;
		case 2:
		{
			bot.sendGroupMsg(gid, '啊啊啊，好大的数，梓言凑不出来了！呜呜(〃＞＿＜;〃)');
		}
		break;
		case 3:
		{
			bot.sendGroupMsg(gid, '唔呣，你给我的数字`' + String(target)
				+ '`太小了啦！我们还是算24吧？(≧ｗ≦；)');
			bot.sendGroupMsg(gid, '铛铛铛！24点游戏开始啦！\n这次是要从['
				+ p24info.numbers.join(',') + ']四则运算得到'
				+ String(p24info.target) + '；一共有3次机会哦~');
		}
		break;
		case 4:
		{
			bot.sendGroupMsg(gid, '唔呣，你给我的数字`' + String(target)
				+ '`梓言不认识呀，我们还是算24吧？(≧ｗ≦；)');
			bot.sendGroupMsg(gid, '铛铛铛！24点游戏开始啦！\n这次是要从['
				+ p24info.numbers.join(',') + ']四则运算得到'
				+ String(p24info.target) + '；一共有3次机会哦~');
		}
		break;
		case 0:
		{
			bot.sendGroupMsg(gid, '铛铛铛！24点游戏开始啦！\n这次是要从['
				+ p24info.numbers.join(',') + ']四则运算得到'
				+ String(p24info.target) + '；一共有3次机会哦~');
		}
		break;
	}
}

async function performAnwser(info)
{
	const bot    = info.bot;
	const gid    = info.event.group_id;
	const uid    = info.event.sender.user_id;
	const expr   = info.event.raw_message;

	const p24info = p24.get24GameInfo(gid);
	if (!p24info) return;

	if (p24.preGuess24Solution(gid, expr))
	{
		if (p24.guess24Solution(gid, expr))
		{
			bot.sendGroupMsg(gid, cqcode.at(uid) + ' 好腻害！答对啦(*^▽^*)！');
			p24.remove24Game(gid);
		} else
		{
			var left_chance = p24info.left_chance;
			if (left_chance > 0)
			{
				bot.sendGroupMsg(gid, cqcode.at(uid)
					+ '好可惜，答错了呐！还剩下'
					+ String(left_chance) + '次机会哦！');
			} else
			{
				bot.sendGroupMsg(gid, '啊，错完了呢！真的有那么难吗？梓言摸头.jpg\n'
					+ '这是梓言做出来的哦，要不……你看一下？(*•ω•)\n'
					+ p24.get24GameSolution(gid).join('\n'));
				p24.remove24Game(gid);
			}
		}
	}
}

async function performSkip(info)
{
	const bot = info.bot;
	const gid = info.event.group_id;

	const p24info = p24.get24GameInfo(gid);

	if (!p24info)
	{
		bot.sendGroupMsg(gid, '游戏还没开始呢，再这样梓言可是会生气的！o(≧口≦)o');
	} else
	{
		bot.sendGroupMsg(gid, '真的有那么难吗？梓言摸头.jpg\n'
			+ '这是梓言做出来的哦，要不……你看一下？(*•ω•)\n'
			+ p24.get24GameSolution(gid).join('\n'));
		p24.remove24Game(gid);
	}
}

function listener_0(info)
{
	const bot   = info.bot;
	const event = info.event;
	const gid   = event.group_id;

	const iscmd = event.raw_message[0] == '.';
	const raw_cmd = event.raw_message.slice(1);

	if (iscmd)
		parser.execute(raw_cmd, cmdDesc, async (subcmd, argeles, freewords) => {
			var target = freewords
				.map((e) => Number(e.word))
				.filter((e) => !isNaN(e))[0];
			if (!target) target = 24;

			if (argeles.help)
			{
				bot.sendGroupMsg(gid, parser.compoundHelpInfo(cmdDesc));
			} else if (argeles.skip)
			{
				performSkip(info);
			} else
			{
				performCreate(info, {
					force: argeles.force ? true : false,
					target: target
				});
			}
		});
	else
		performAnwser(info);
}

const description = {
	plugin: 'p24',
	actions: [{
		event: 'message.group.normal',
		subname: 'core',
		action: listener_0
	}]
};

module.exports =
{
	description
};