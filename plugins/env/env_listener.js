"use strict";

const path = require('path');
const { loadFileAsJson } = require('../../lib/filesys');
const parser = require('../../lib/parser');
const plugin = require('../../lib/plugin');

const cmdDesc = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, 'env.json'))
);

function setup(bot, field)
{
	field.admin = 1745096608;
}

function performNew(info, newData)
{
	let   bot   = info.bot;
	const event = info.event;
	const gid   = event?.group_id;
	const uid   = event?.user_id;
	let env = newData.env;

	if (!env) return;

	if (bot.envs.includes(env))
	{
		bot.sendMsg('环境已存在！', { gid: gid, uid:uid });
	} else
	{
		let old_env = bot.env;
		bot.switchTo(env, true);
		if (bot.envs.includes(env))
		{
			bot.sendMsg(`环境"${env}"创建成功！`, { gid: gid, uid:uid });
		} else
		{
			bot.sendMsg(`环境创建失败！`, { gid: gid, uid:uid });
		}
	}
}

function performSet(info, setData)
{
	let   bot   = info.bot;
	const event = info.event;
	const gid   = event?.group_id;
	const uid   = event?.user_id;
	let env = setData.env;

	if (!env)
	{
		bot.sendMsg(`${info.event.sender.nickname}，需要换到什么环境呢？`,
			{ gid: gid, uid:uid });
		return;
	}

	if (env == bot.env)
	{
		bot.sendMsg(`现在已经是"${env}"环境啦~`, { gid: gid, uid:uid });
		return;
	}

	if (!bot.envs.includes(env))
	{
		bot.sendMsg(`环境"${env}"不存在！`, { gid: gid, uid:uid });
	} else
	{
		bot.switchTo(env);
		bot.sendMsg(`成功切换到"${env}"环境啦！`, { gid: gid, uid:uid });
	}
}

function listener_0(info)
{
	let   bot   = info.bot;
	const event = info.event;
	const gid   = event?.group_id;
	const uid   = event?.user_id;

	if (event.raw_message[0] != '.') return;
	let raw_cmd = event.raw_message.slice(1);

	parser.execute(raw_cmd, cmdDesc, async (subcmd, argeles, freewords) => {

		if (uid != bot.getShared('env').admin) return;

		switch (subcmd.keyword)
		{
			case 'new':
				performNew(info, { env: subcmd.args ? subcmd.args._[0] : null });
			break;
			case 'set':
				performSet(info, { env: subcmd.args ? subcmd.args._[0] : null });
			break;
			case 'list':
				bot.sendMsg(`环境列表：\n${bot.envs.join('\n')}`, { gid: gid, uid: uid });
			break;
			default:
				bot.sendMsg(`当前环境：${bot.env}`, { gid: gid, uid:uid });
			break;
		}
	}).catch((e) => {
		console.error('[ERROR] plugin.env:', e.message);
	});
}

const description =
{
	plugin: 'env',
	setup: setup,
	actions: [{
		event: 'message',
		subname: 'ctrl',
		action: listener_0
	}]
};

module.exports =
{
	description
};