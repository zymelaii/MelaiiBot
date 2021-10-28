"use strict";

const path = require('path');
const fs = require('fs');
const { writeFileSync, loadFileAsJson, dumpBakFile } = require('../../lib/filesys');

const parser = require('../../lib/parser');
const permission = require('../../lib/permission');

const doc = require('./helpdoc');

const cmdDesc = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, 'permission.json'))
);

function setup(field)
{
	this.addListener('plugin', 'permission-barriar',
	function (event) { //! 权限关卡
		let root  = event.plugin;
		let node  = event.sub_plugin;

		let scope   = String(event?.group_id);
		let user_id = event?.user_id ? String(event.user_id) : null;

		this.trace(`----------------`);
		this.trace(`plugin barriar: on cpl-test`);

		if (field.pr == null)
		{
			this.trace(`plugin barriar: initialize`);
			field.pr = new permission.Permission(this.uin, 1745096608);
		}
		let pr = field.pr;

		if (event?.post_type       == 'message'
			&& event?.message_type == 'private'
			&& event?.sub_type     == 'group')
		{	//! 群临时会话
			scope = 'temporary';
			if (pr.getCPL(user_id, 'global') == -1
				&& pr.getCPL(user_id, 'temporary') == -1)
			{
				pr.addGuest(user_id);
				this.trace(`plugin barriar: add guest:`, user_id);
			}
		}

		if (event?.post_type       == 'message'
			&& event?.message_type == 'private'
			&& event?.sub_type     == 'friend')
		{	//! 好友私聊会话
			scope = 'global';
			if (pr.getCPL(user_id, scope) == -1)
			{
				let result = pr.addUser(user_id, scope);
				this.trace(`plugin barriar: add user:`, user_id, `(${scope})`);
			}
		}

		if (!pr.hasScope(scope))
		{	//! 域不存在，新建本地域
			pr.createLocalScope(scope);
			this.trace(`plugin barriar: create scope:`, scope);
		}

		let cpl = pr.getCPL(user_id, scope);
		if (cpl == -1)
		{
			cpl = 3;
			let result = pr.addUser(user_id, scope);
			this.trace(`plugin barriar: add user:`, user_id, `(${scope})`);
		}

		if (!pr.hasPermissionItem(root, node, scope))
		{
			pr.setPermission({
				root, nodes: [node], level: 1
			}, { scope }, pr.root, 'global');
			this.trace(`plugin barriar: create permission:`, `${root}.${node}`);
		}

		let passed = user_id
			? pr.cplTest(root, node, user_id, scope)
			: pr.isActive(root, scope);

		this.trace(`plugin:    `, root);
		this.trace(`sub-plugin:`, node);
		this.trace(`scope:     `, scope);
		this.trace(`user_id:   `, user_id);
		this.trace(`cpl:       `, ['root', 'sa', 'admin', 'user', 'guest'][cpl]);

		this.trace(`plugin barriar: cpl-test done:`, passed);
		this.trace(`----------------`);

		return passed;
	}, -1);
}

function uninstall()
{
	//! TODO
}

function dummy()
{
	return true;
}

const description =
{
	plugin: 'permission',
	setup,
	uninstall,
	actions: [{
		event: 'message',
		subname: 'manager',
		action: dummy
	}]
};

module.exports =
{
	description
};