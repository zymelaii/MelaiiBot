"use strict";

const path = require('path');
const { randomInt } = require('../../lib/utils');

function randomPickLocal()
{
	const MIN = 0, MAX = 3913;
	let fn = `${randomInt(MIN, MAX).toString().padStart(8, '0')}.jpg`;
	return path.resolve(`H:\\IMAGE\\自动化仓库\\jpeg-bank\\${fn}`);
}

function randomPickKonachan()
{

}

module.exports =
{
	randomPickLocal,
	randomPickKonachan
};