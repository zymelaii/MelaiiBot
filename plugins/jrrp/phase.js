"use strict";

const fs = require('fs');
const path = require('path');
const { loadFileAsJson } = require('../../lib/filesys');
const seedRandom = require('seed-random');
const { getRandom } = require('./jrrp');

const PHASES = loadFileAsJson(
	path.resolve(__dirname, './assets/phase.json'));

function getPhase(index)
{
	if (!(index >= 1 && index <= 64)) return null;
	return PHASES[index - 1];
}

function getRandomPhase(seed)
{
	return getPhase(getRandom(seed, 1, 64));
}

module.exports = {
	getPhase,
	getRandomPhase
};
