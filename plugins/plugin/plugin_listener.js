"use strict";

const path = require('path');
const { loadFileAsJson } = require('../../lib/filesys');
const parser = require('../../lib/parser');
const plugin = require('../../lib/plugin');

const cmdDesc = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, 'plugin.json'))
);

function performRegister(info, registerData)
{
	const bot   = info.bot;
	const event = info.event;
	const gid   = event.group_id;
	const uid   = event.user_id;

	const plugin_name = registerData.plugin;
	let resp = plugin.register(bot, plugin_name);
	let status = resp.status_code;

	if (status == 0)
	{
		bot.sendMsg('插件安装成功！', { gid: gid, uid: uid });
		bot.mark(`插件 ${plugin_name} 已加载`);
	} else
	{
		if (status == 1) bot.sendMsg('插件已安装！', { gid: gid, uid: uid });
		else bot.sendMsg('插件安装失败！', { gid: gid, uid: uid });
		if (status != -4) bot.warn(`MelaiiBot@plugins.plugin: ${resp.errmsg}`);
		else bot.warn(`插件 ${plugin_name} 加载失败（${resp.exception.message}）`);
	}
}

function performRemove(info, removeData)
{
	const bot   = info.bot;
	const event = info.event;
	const gid   = event.group_id;
	const uid   = event.user_id;

	if (bot.getShared('plugin').admin != uid)
	{
		bot.sendMsg('权限不足！', { gid: gid, uid: uid });
		return;
	}

	const plugin_name = removeData.plugin;
	let resp = plugin.unregister(bot, plugin_name);
	let status = resp.status_code;

	if (status == 0)
	{
		bot.sendMsg('插件卸载成功！', { gid: gid, uid: uid });
		bot.mark(`插件 ${plugin_name} 已卸载`);
	} else
	{
		if (status == 1) bot.sendMsg('插件未安装！', { gid: gid, uid: uid });
		else if (status == -3) bot.sendMsg('无权卸载插件！', { gid: gid, uid: uid });
		else bot.sendMsg('插件卸载失败！', { gid: gid, uid: uid });
		bot.warn(`插件 ${plugin_name} 卸载失败（${resp.errmsg}）`);
	}
}

function performReload(info, reloadData)
{
	const bot   = info.bot;
	const event = info.event;
	const gid   = event.group_id;
	const uid   = event.user_id;

	if (bot.getShared('plugin').admin != uid)
	{
		bot.sendMsg('权限不足！', { gid: gid, uid: uid });
		return;
	}

	const plugin_name = reloadData.plugin;
	let resp = plugin.register(bot, plugin_name);
	let status = resp.status_code;

	if (status == 0)
	{
		bot.sendMsg('插件重载成功！', { gid: gid, uid: uid });
		bot.mark(`插件 ${plugin_name} 已重载`);
	} else
	{
		bot.sendMsg('插件重载失败！', { gid: gid, uid: uid });
		if (status != -4) bot.error(`MelaiiBot@plugins.plugin: ${resp.errmsg}`);
		else bot.warn(`插件 ${plugin_name} 重载失败（${resp.exception.message}）`);
	}
}

function performList(info)
{
	const bot   = info.bot;
	const event = info.event;
	const gid   = event.group_id;
	const uid   = event.user_id;

	bot.sendMsg(`当前已加载插件：\n${bot.plugins.join('\n')}`, { gid: gid, uid: uid });
}

function setup(bot, field)
{
	field.admin = 1745096608;
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
		switch (subcmd.keyword)
		{
			case 'register':
				performRegister(info, {
					plugin: subcmd.args._ ? subcmd.args._[0] : null
				});
			break;
			case 'remove':
				performRemove(info, {
					plugin: subcmd.args._ ? subcmd.args._[0] : null
				});
			break;
			case 'reload':
				performReload(info, {
					plugin: subcmd.args._ ? subcmd.args._[0] : null
				});
			break;
			case 'list':
				performList(info);
			break;
		}
	}).catch((e) => {
		bot.error(`plugin.plugin: ${e.message}`);
	});
}

const description =
{
	plugin: 'plugin',
	setup: setup,
	actions: [{
		event: 'message',
		subname: 'manager',
		action: listener_0
	}]
};

module.exports =
{
	description
};