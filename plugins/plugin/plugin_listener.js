"use strict";

const path = require('path');
const { loadFileAsJson } = require('../../lib/filesys');
const parser = require('../../lib/parser');
const plugin = require('../../lib/plugin');

const cmdDesc = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, 'plugin.json'))
);

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

		let resp, plugin_name;
		switch (subcmd.keyword)
		{
			case 'register':
				plugin_name = subcmd.args._ ? subcmd.args._[0] : null;
				resp = plugin.register(bot, plugin_name);
				switch (resp.status_code)
				{
					case 0:
						bot.sendMsg('插件安装成功！', { gid: gid, uid: uid });
					break;
					case 1: bot.sendMsg('插件已安装！', { gid: gid, uid: uid }); break;
					default:
						bot.sendMsg('插件安装失败！', { gid: gid, uid: uid });
						console.error(`[ERROR] plugin.plugin: ${resp.errmsg}`);
					break;
				}
			break;
			case 'remove':
				plugin_name = subcmd.args._ ? subcmd.args._[0] : null;
				if (bot.getShared('plugin').admin != uid)
				{
					bot.sendMsg('权限不足！', { gid: gid, uid: uid });
					return;
				}
				resp = plugin.unregister(bot, plugin_name);
				switch (resp.status_code)
				{
					case 0: bot.sendMsg('插件卸载成功！', { gid: gid, uid: uid }); break;
					case 1: bot.sendMsg('插件未安装！', { gid: gid, uid: uid }); break;
					default:
						bot.sendMsg('插件卸载失败！', { gid: gid, uid: uid });
						console.error(`[ERROR] plugin.plugin: ${resp.errmsg}`);
					break;
				}
			break;
			case 'reload':
				plugin_name = subcmd.args._ ? subcmd.args._[0] : null;
				if (bot.getShared('plugin').admin != uid)
				{
					bot.sendMsg('权限不足！', { gid: gid, uid: uid });
					return;
				}
				resp = plugin.register(bot, plugin_name, true);
				switch (resp.status_code)
				{
					case 0: bot.sendMsg('插件重载成功！', { gid: gid, uid: uid }); break;
					default:
						bot.sendMsg('插件重载失败！', { gid: gid, uid: uid });
						console.error(`[ERROR] plugin.plugin: ${resp.errmsg}`);
					break;
				}
			break;
			case 'list':
				bot.sendMsg(`当前已加载插件：\n${bot.plugins.join('\n')}`,
					{ gid: gid, uid: uid });
			break;
		}
	}).catch((e) => {
		console.error('[ERROR] plugin.plugin:', e.message);
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