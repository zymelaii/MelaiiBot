"use strict";

const path = require('path');
const fs = require('fs');
const { writeFileSync, loadFileAsJson, dumpBakFile } = require('../../lib/filesys');
const parser = require('../../lib/parser');

const doc = require('./helpdoc');

const cmdDesc = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, 'permission.json'))
);

const CONFIG_FILE = path.resolve(__dirname, './assets/.permissions');

function setup(field)
{	//! 载入权限列表
	if (!field.initialized)
	{
		field.permissions = loadFileAsJson(CONFIG_FILE);
		if (!field.permissions)
		{
			field.permissions = {
			/// plugin: {
			//!		mode: 0|1, 黑名单|白名单
			//!		nodes: [
			//!			{
			//!				subname: String 插件子单元，空字符串代表统一权限
			//!				objlist: Array<Map { gid, uid }|String { 'admin', 'owner', 'member' }> 对象名单
			//!			},...
			//! 	]
			///	}
			};
			writeFileSync(CONFIG_FILE, JSON.stringify(field.permissions, null, 4));
		}
		field.initialized = true;
	}

	this.addListener('plugin', '#permissionBarrier', function (event) {
		const this_permission = field.permissions[event.plugin];
		if (!this_permission) return true; //! 未设置权限，允许通过
		const all_barriar = this_permission.nodes.find((e) => e.subname == '');
		const this_barriar = this_permission.nodes.find((e) => e.subname == event.sub_plugin);
		let barriar = (all_barriar.objlist ?? []).concat(this_barriar.objlist ?? []);
		for (let i = 0; i < barriar.objlist.length; ++i)
		{
			let obj = all_barriar.objlist[i];
			if (typeof(obj) == 'string')
			{
				if (obj == event.sender.role)
				{
					if (this_permission.mode == 0) return false; //! 在黑名单中
					if (this_permission.mode == 1) return true;  //! 在白名单中
				}
			} else if (!!barriar.gid && !!event.group_id)
			{
				if (barriar.gid == event.group_id)
				{
					if (this_permission.mode == 0) return false; //! 在黑名单中
					if (this_permission.mode == 1) return true;  //! 在白名单中
				}
			} else if (!!barriar.uid && !!event.user_id)
			{
				if (barriar.uid == event.user_id)
				{
					if (this_permission.mode == 0) return false; //! 在黑名单中
					if (this_permission.mode == 1) return true;  //! 在白名单中
				}
			}
		}
		return ({ 0: true, 1: false })[this_permission.mode] ?? true;
	}, 0);
}

function uninstall()
{	//! 存档权限列表，卸载权限关卡
	let field = this.getShared('permission');
	if (field.initialized)
	{
		dumpBakFile(CONFIG_FILE);
		writeFileSync(CONFIG_FILE, JSON.stringify(field.permissions, null, 4), true);
		this.delListener('plugin', '#permissionBarrier');
		field.initialized = false;
	}
}

function performAllow(event, allowData)
{

}

function performBan(event, banData)
{

}

function listener_0(event)
{
	const gid = event?.group_id;
	const uid = event?.user_id;

	if (event.raw_message[0] != '.') return;
	const raw_cmd = event.raw_message.slice(1);

	parser.execute(raw_cmd, cmdDesc, (subcmd, argeles, freewords) => {

		let plugin = freewords[0]?.word;

		let _uid   = argeles.user  ? argeles.user.args[0]  : null;
		let _gid   = argeles.group ? argeles.group.args[0] : null;
		let _role  = argeles.role  ? argeles.role.args[0]  : null;

		if (_uid != null)
		{
			_uid = _uid == '$' ? uid : Number(_uid);
			if (!isNaN(_uid)) _uid = null;
		}

		if (_gid != null)
		{
			_gid = _gid == '$' ? gid : Number(_gid);
			if (!isNaN(_gid)) _gid = null;
		}

		let data = { plugin: plugin, uid: _uid, gid: _gid, role: _role, mode: _mode };

		switch (subcmd.keyword)
		{
			case 'allow': performAllow.call(this, event, data); break;
			case 'ban':   performBan.call(this, event, data);   break;
			default:
				if (argeles.help) this.sendMsg(doc.HELP_ALL, { gid: gid, uid: uid });
			break;
		}
	}).catch((e) => {
		this.error('plugin.permission:', e.message);
	});
}

const description =
{
	plugin: 'permission',
	setup: setup,
	uninstall: uninstall,
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