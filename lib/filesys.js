"use strict";

const path = require('path');
const fs = require('fs');

/// writeFileSync(fs, data, overwrite)
//! @param: fn: full path of file
///
function writeFileSync(fn, data, overwrite = false)
{
	const fnpath = path.resolve(fn);

	if (fs.existsSync(fnpath) && !overwrite) return;

	const directory = path.dirname(fnpath);
	if (!fs.existsSync(directory)) fs.mkdirSync(directory, true);

	fs.writeFileSync(fnpath, data);
}

/// dumpBakFile(fn)
//! @param: fn: full path of file
///
function dumpBakFile(fn)
{
	const fnpath = path.resolve(fn);

	if (!fs.existsSync(fnpath)) return;

	const data = fs.readFileSync(fnpath);

	const fnbasebak = fnpath + '.bak';

	if (!fs.existsSync(fnbasebak))
	{
		writeFileSync(fnbasebak, data);
		return;
	}

	const maxBakIndex = 32;
	let bakIndex = 0;
	while (++bakIndex < maxBakIndex)
	{
		let fnbak = `${fnbasebak}.${bakIndex}`;
		if (!fs.existsSync(fnbak))
		{
			writeFileSync(fnbak, data);
			return;
		}
	}

	throw new Error(`MelaiiBot@file.dumpBakFile: too many bak files of ${fn}`);
}

/// loadFileAsJson(fn)
//! @param: fn: full path of file
//! @return: json document of given file
///
function loadFileAsJson(fn)
{
	const fnpath = path.resolve(fn);

	if (!fs.existsSync(fnpath)) return null;

	try {
		return JSON.parse(fs.readFileSync(fnpath).toString());
	} catch(e) {
		console.warn(
			`[WARN] MelaiiBot@file.loadFileAsJson: file ${fn} may not be a json document`);
		return null;
	}
}

module.exports =
{
	writeFileSync,
	dumpBakFile,
	loadFileAsJson
};