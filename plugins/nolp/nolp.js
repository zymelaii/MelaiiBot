"use strict";

const path = require('path');
const { randomInt } = require('../../lib/utils');

function randomPick()
{
	const MIN = 0, MAX = 3913;
	let fn = `${randomInt(MIN, MAX).toString().padStart(8, '0')}.jpg`;
	return path.resolve(`H:\\IMAGE\\自动化仓库\\jpeg-bank\\${fn}`);
}

module.exports =
{
	randomPick
};