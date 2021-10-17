"use strict";

const fs = require('fs');
const { cloneDeep } = require('lodash');
const { writeFileSync, dumpBakFile, loadFileAsJson } = require('../../lib/filesys');
const { HBDAT_MANAGER, HBDAT_SERVER, HBDAT_USERS, getDataPath } = require('./core');
const { createServerDesc, HBServer } = require('./server');

///
//! @desc: 创建中心管理档案
//! @param: sidlist: [{ name, sid }]
///
function dumpManagerData(sidlist)
{
	const fnman = getDataPath(HBDAT_MANAGER);

	/// 中心管理档案
	//! servers: [{
	//! 	name: 服务器名称
	//! 	sid: 服务器编号
	//! },...]
	///

	let maninfo = {
		servers: sidlist.sort((a, b) => a.sid - b.sid) //! 按编号升序排列
	};

	let jsondoc = JSON.stringify(maninfo, null, 4);

	dumpBakFile(fnman);
	writeFileSync(fnman, jsondoc, true);
}

///
//! @desc: 更新中心管理档案服务器列表
//! @param: sidlist: [{ name, sid }]
//! @param: overwrite: boolean 覆盖或合并
///
function updateServerList(sidlist, overwrite = false)
{
	const fnman = getDataPath(HBDAT_MANAGER);
	let exist = fs.existsSync(fnman);

	if (overwrite || !exist)
	{
		dumpManagerData(sidlist);
		return;
	}

	let new_servers = sidlist.map((e) => {
		return { name: e.name, sid: e.sid };
	}).sort((a, b) => a.sid - b.sid);

	try {
		var old_servers = loadFileAsJson(fnman).servers;
	} catch(e) {
		console.error(
			`[ERROR] plugin.hush-battle.updateServerList: failed updating (${e.message})`);
	}

	let servers = [];
	let p = 0, q = 0;
	const len1 = old_servers.length, len2 = new_servers.length;

	while (p < len1 && q < len2)
	{
		if (old_servers[p].sid == new_servers[q].sid)
		{
			servers.push(new_servers[q]);
			++p, ++q;
			continue;
		}

		if (old_servers[p].sid < new_servers[q].sid)
		{
			servers.push(old_servers[p++]);
		} else
		{
			servers.push(new_servers[q++]);
		}
	}

	if (p < len1)
	{
		servers = servers.concat(old_servers.slice(p));
	}

	if (q < len2)
	{
		servers = servers.concat(new_servers.slice(q));
	}

	dumpManagerData(servers);
}

class HBManager
{
	constructor()
	{
		const fnman = getDataPath(HBDAT_MANAGER);

		this._maninfo = loadFileAsJson(fnman);
		if (!this._maninfo)
		{
			this._maninfo = { servers: [] };
			dumpManagerData(this._maninfo.servers);
		}

		this._active_servers = [/*HBServer*/];
	}

	get servers()
	{
		return cloneDeep(this._maninfo.servers);
	}

	getOnlineServer(sid)
	{
		return this._active_servers.find((e) => e.sid == sid);
	}

	addServers(sidlist)
	{
		let servers = [];
		let old_servers = this._maninfo.servers;
		let new_servers = sidlist.map((e) => {
			return { name: e.name, sid: e.sid };
		}).sort((a, b) => a.sid - b.sid);

		while (p < len1 && q < len2)
		{
			if (old_servers[p].sid == new_servers[q].sid)
			{
				servers.push(new_servers[q]);
				++p, ++q;
				continue;
			}

			if (old_servers[p].sid < new_servers[q].sid)
			{
				servers.push(old_servers[p++]);
			} else
			{
				servers.push(new_servers[q++]);
			}
		}

		if (p < len1)
		{
			servers = servers.concat(old_servers.slice(p));
		}

		if (q < len2)
		{
			servers = servers.concat(new_servers.slice(q));
		}

		updateServerList(servers, true);
		this._maninfo.servers = servers;
	}

	openServer(sid)
	{
		let server = this.getOnlineServer(sid);
		if (!!server) return server;

		const fnserver = getDataPath(HBDAT_SERVER, { server: sid });

		let serverinfo = loadFileAsJson(fnserver);
		let shouldDump = !serverinfo;

		if (shouldDump) serverinfo = createServerDesc(sid, []);

		server = new HBServer(serverinfo);

		if (shouldDump) server.updateAndSave();

		this._active_servers.push(server);

		return server;
	}

	closeServer(sid)
	{
		let index = this._active_servers.findIndex((e) => e.sid == sid);
		if (index == -1) return;

		this._active_servers[index].updateAndSave();
		this._active_servers.splice(index, 1);
	}

	shutdown()
	{
		this._active_servers.forEach((e) => {
			e.updateAndSave();
		});
		this._active_servers = [];
	}

	isOpened(sid)
	{
		return this._active_servers.findIndex((e) => e.sid == sid) != -1;
	}
}

module.exports =
{
	dumpManagerData,
	updateServerList,
	HBManager
};