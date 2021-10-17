"use strict";

const fs = require('fs');

const { writeFileSync, dumpBakFile } = require('../../lib/filesys');
const { HBDAT_MANAGER, HBDAT_SERVER, HBDAT_USERS, getDataPath } = require('./core');
const { dumpManagerData, updateServerList } = require('./manager');
const { newDefaultRole } = require('./role');
const { createServerDesc } = require('./server');

///
//! @param: server: Number QQ群编号
//! @param: uidlist: [{ uid, nickname }] 用户信息列表
//! @return: status : { 0: ok, 1: ignore, 2: overwrite, -1: failed }
///
function initialize(server, uidlist, overwrite = false)
{
	const fnserver = getDataPath(HBDAT_SERVER, { server: server });
	const fnroles  = getDataPath(HBDAT_USERS, { server: server });

	let exist = fs.existsSync(fnserver);
	if (!fnserver || exist && !overwrite) return 1;

	try {
		var records = uidlist.map((e) => {
			return newDefaultRole({ uid: e.uid, nickname: e.nickname })
		});
		var serverinfo = createServerDesc(server, records);
	} catch(e) {
		console.error(
			`[ERROR] plugin.hush-battle: illegal setup data for ${server} (${e.message})`);
		return -1;
	}

	try {
		var jsondocs = [
			JSON.stringify(serverinfo, null, 4),
			JSON.stringify(records, null, 4)
		];
	} catch(e) {
		console.error(
			`[ERROR] plugin.hush-battle: failed initializing server ${server} (${e.message})`);
		return -1;
	}

	let status = 0;

	if (exist && overwrite)
	{
		dumpBakFile(fnserver);
		dumpBakFile(fnroles);
		status = 2;
	}

	writeFileSync(fnserver, jsondocs[0], true);
	writeFileSync(fnroles, jsondocs[1], true);

	if (!fs.existsSync(getDataPath(HBDAT_MANAGER)))
	{
		dumpManagerData([{ name: serverinfo.server, sid: serverinfo.sid }]);
	} else
	{
		updateServerList([{ name: serverinfo.server, sid: serverinfo.sid }]);
	}

	return status;
}

module.exports =
{
	initialize
};