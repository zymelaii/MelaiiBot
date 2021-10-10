"use strict";

const seedRandom = require('seed-random');

function getRandom(seed, minval, maxval)
{
	const e = seedRandom(seed);
	return Math.floor(e() * (maxval - minval + 1) + minval);
}

function getRp(uid, year, month, day)
{
	return getRandom(uid + [year, month, day].join('/'), -20, 120);
}

module.exports =
{
	getRp
};