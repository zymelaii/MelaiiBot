"use strict";

const path = require('path');
const { loadFileAsJson } = require('../../lib/filesys');
const parser = require('../../lib/parser');
const plugin = require('../../lib/plugin');

const cmdDesc = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, 'plugin.json'))
);

function performRegister(event, registerData)
{
	const gid = event.group_id;
	const uid = event.user_id;

	const plugin_name = registerData.plugin;
	let resp = plugin.register(this, plugin_name);
	let status = resp.status_code;

	if (status == 0)
	{
		this.sendMsg('插件安装成功！', { gid: gid, uid: uid });
		this.mark(`插件 ${plugin_name} 已加载`);
	} else
	{
		if (status == 1) this.sendMsg('插件已安装！', { gid: gid, uid: uid });
		else this.sendMsg('插件安装失败！', { gid: gid, uid: uid });
		if (status != -4) this.warn(`MelaiiBot@plugins.plugin: ${resp.errmsg}`);
		else this.warn(`插件 ${plugin_name} 加载失败（${resp.exception.message}）`);
	}
}

function performRemove(event, removeData)
{
	const gid = event.group_id;
	const uid = event.user_id;

	if (this.getShared('plugin').admin != uid)
	{
		this.sendMsg('权限不足！', { gid: gid, uid: uid });
		return;
	}

	const plugin_name = removeData.plugin;
	let resp = plugin.unregister(this, plugin_name);
	let status = resp.status_code;

	if (status == 0)
	{
		this.sendMsg('插件卸载成功！', { gid: gid, uid: uid });
		this.mark(`插件 ${plugin_name} 已卸载`);
	} else
	{
		if (status == 1) this.sendMsg('插件未安装！', { gid: gid, uid: uid });
		else if (status == -3) this.sendMsg('无权卸载插件！', { gid: gid, uid: uid });
		else this.sendMsg('插件卸载失败！', { gid: gid, uid: uid });
		this.warn(`插件 ${plugin_name} 卸载失败（${resp.errmsg}）`);
	}
}

function performReload(event, reloadData)
{
	const gid = event.group_id;
	const uid = event.user_id;

	if (this.getShared('plugin').admin != uid)
	{
		this.sendMsg('权限不足！', { gid: gid, uid: uid });
	}

	const plugin_name = reloadData.plugin;
	let resp = plugin.register(this, plugin_name, true);
	let status = resp.status_code;

	if (status == 0)
	{
		this.sendMsg('插件重载成功！', { gid: gid, uid: uid });
		this.mark(`插件 ${plugin_name} 已重载`);
	} else
	{
		this.sendMsg('插件重载失败！', { gid: gid, uid: uid });
		if (status != -4) this.mark(`MelaiiBot@plugins.plugin: ${resp.errmsg}`);
		else this.warn(`插件 ${plugin_name} 重载失败（${resp.exception.message}）`);
	}
}

function performList(event)
{
	const gid = event.group_id;
	const uid = event.user_id;

	this.sendMsg(`当前已加载插件：\n${this.plugins.join('\n')}`, { gid: gid, uid: uid });
}

function setup(field)
{
	field.admin = 1745096608;
}

async function listener_0(event)
{
	const gid = event?.group_id;
	const uid = event?.user_id;

	if (event.raw_message[0] != '.') return true;
	let raw_cmd = event.raw_message.slice(1);

	return await parser.execute(raw_cmd, cmdDesc,
	async (subcmd, argeles, freewords) => {
		switch (subcmd.keyword)
		{
			case 'register':
				performRegister.call(this, event, {
					plugin: subcmd.args._ ? subcmd.args._[0] : null
				});
			break;
			case 'remove':
				performRemove.call(this, event, {
					plugin: subcmd.args._ ? subcmd.args._[0] : null
				});
			break;
			case 'reload':
				performReload.call(this, event, {
					plugin: subcmd.args._ ? subcmd.args._[0] : null
				});
			break;
			case 'list':
				performList.call(this, event);
			break;
		}
		return false;
	}).catch((e) => {
		this.error(`plugin.plugin: ${e.message}`);
		return true;
	}) ?? true;
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