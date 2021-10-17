"use strict";

const path = require('path');
const fs = require('fs');

const DATADIR = './data';

const HBDAT_MANAGER = 'manager';
const HBDAT_SERVER  = 'server';
const HBDAT_USERS   = 'users';

///
//! @param: type: [HBDAT_MANAGER, HBDAT_SERVER, HBDAT_USERS]
//! @param: config: { server }
///
function getDataPath(type, config)
{
	switch (type)
	{
		case HBDAT_SERVER:
		case HBDAT_USERS:
			if (!config?.server) return null;
			return path.resolve(
				__dirname, `${DATADIR}/hush-battle.${config.server}.${type}.json`);
		break;
		case HBDAT_MANAGER:
			return path.resolve(
				__dirname, `${DATADIR}/hush-battle.${type}.json`);
		default: return null;
	}
}

module.exports =
{
	HBDAT_MANAGER,
	HBDAT_SERVER,
	HBDAT_USERS,
	getDataPath
};