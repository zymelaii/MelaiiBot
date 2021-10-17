"use strict";

const { cloneDeep } = require('lodash');
const utils = require('../../lib/utils');
const { isActiveRecently, HBRole } = require('./role');
const { writeFileSync, dumpBakFile, loadFileAsJson } = require('../../lib/filesys');
const { HBDAT_MANAGER, HBDAT_SERVER, HBDAT_USERS, getDataPath } = require('./core');

function createServerDesc(server, rolelist)
{
	/// 服务器信息
	//! server: 服务器名称
	//! sid: 服务器编号
	//! version: 版本
	//! runtime: 运行时间
	//! popularity: 热度
	//! role_total: 服务器总人数
	//! active_total: 活跃人数（七天内上线人数）
	//! active_ratio: 活跃系数（活跃人数/总人数）
	///

	let _server       = utils.randomCNCommon(utils.randomInt(2, 6));
	let _sid          = server;
	let _version      = '1.0.0@beta';
	let _runtime      = 0;
	let _popularity   = 0;
	let _role_total   = rolelist.length;
	let _active_total = rolelist.filter((e) => isActiveRecently(e)).length;
	let _active_ratio = _role_total == 0 ? 0 : _active_total / _role_total;
	let _blacklist    = [];

	return {
		server:       _server,
		sid:          _sid,
		version:      _version,
		runtime:      _runtime,
		popularity:   _popularity,
		role_total:   _role_total,
		active_total: _active_total,
		active_ratio: _active_ratio,
		blacklist:    _blacklist
	};
}

function loadServerRoles(sid)
{
	const fnroles = getDataPath(HBDAT_USERS, { server: sid });
	let rolelist = loadFileAsJson(fnroles);
	if (!rolelist) return [];

	return rolelist.map((e) => new HBRole(e));
}

class HBServer
{
	constructor(serverinfo)
	{
		this._serverinfo   = cloneDeep(serverinfo);
		this._start_tick   = new Date().getTime();
		this._rolelist     = loadServerRoles(this._serverinfo.sid);
		this._blacklist    = this._serverinfo.blacklist;
		this._online_roles = [/*uid: Number*/];
	}

	get sid()
	{
		return this._serverinfo.sid;
	}

	update()
	{
		let current_tick = new Date().getTime();
		this._serverinfo._runtime +=
			current_tick - this._start_tick;
		this._start_tick = current_tick;
	}

	updateAndSave()
	{
		this.update();

		this._rolelist.forEach((e, i) => {
			if (this._rolelist[i].isOnline())
			{
				this._rolelist[i].refreshOnlineStatus();
			}
		});

		const fnserver = getDataPath(HBDAT_SERVER, { server: server });
		const fnroles  = getDataPath(HBDAT_USERS, { server: server });

		var jsondocs = [
			JSON.stringify(this._serverinfo, null, 4),
			JSON.stringify(this._rolelist.map((e) => e.info), null, 4)
		];

		writeFileSync(fnserver, jsondocs[0], true);
		writeFileSync(fnroles, jsondocs[1], true);
	}

	connect(uid)
	{
		if (this._online_roles.indexOf(uid) != -1
			|| this._blacklist.indexOf(uid) != -1) return;

		let index = this._rolelist.findIndex((e) => e.uid == uid);
		if (index == -1) return;

		this._rolelist[index].login();
		this._online_roles.push(uid);
	}

	disconnect(uid)
	{
		let index = this._online_roles.indexOf((e) => e.uid == uid);
		if (index != -1)
		{
			this._online_roles.splice(index, 1);
			index = this._rolelist.findIndex((e) => e.uid == uid);
			this._rolelist[index].logout();
		}
	}

	getRoleInfo(uid)
	{
		return this._rolelist.find((e) => e.uid == uid);
	}

	banRole(uid)
	{
		if (this._blacklist.indexOf(uid) != -1) return;

		let index = this._rolelist.findIndex((e) => e.uid == uid);
		if (index == -1) return;

		let role = this._rolelist[index];
		role.logout();
		role.refreshOnlineStatus();

		this._blacklist.push(role.uid);
	}

	unbanRole(uid)
	{
		let index = this._blacklist.indexOf(uid);
		if (index == -1) return;

		this._blacklist.splice(index, 1);
	}
}

module.exports =
{
	createServerDesc,
	loadServerRoles,
	HBServer
}