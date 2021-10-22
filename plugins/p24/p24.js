"use strict"

const { calc24, gen24, check24, eval24 } = require('./p24_core');

var p24_games =
{/**
 *   group_id: {
 *     sender: user_id
 *     start_time: timestamp
 *     numbers: [int, int, int, int]
 *     target: int
 *     left_chance: int
 *   }
 **/};

//@ GroupMessageEventData
function get24GameInfo(gid)
{
	return p24_games[gid];
}

function create24Game(gid, uid, target, generator)
{
	// { status: { code: int, info: str }, data: object }

	if (p24_games[gid] != null)
	{
		return {
			status: {
				code: 1,
				info: '24 game is already on'
			},
			data: null,
		};
	}

	let isIlligalTarget = false;
	let _status_code;
	let _status_info;

	if (typeof(target) != 'number')
	{
		target = Number(target);
	}

	if (target <= 1)
	{
		_status_code = 3;
		_status_info = 'target is too small (corrected to 24)';
		isIlligalTarget = true;
	} else if (isNaN(target))
	{
		_status_code = 4;
		_status_info = 'illegal number (corrected to 24)';
		isIlligalTarget = true;
	}

	if (isIlligalTarget)
	{
		target = 24;
	}

	let nums = generator(target);

	if (nums.length == 0)
	{
		return {
			status: {
				code: 2,
				info: 'failed generating numbers'
			},
			data: null
		};
	}

	p24_games[gid] = {
		sender: uid,
		start_time: Date.parse(new Date()),
		numbers: nums.slice(0),
		target: target,
		left_chance: 3
	};

	return {
		status: {
			code: isIlligalTarget ? _status_code : 0,
			info: isIlligalTarget ? _status_info : 'done'
		},
		data: p24_games[gid]
	};
}

function remove24Game(gid)
{
	if (p24_games[gid] != null)
	{
		delete p24_games[gid];
	}
}

function preGuess24Solution(gid, input)
{
	if (p24_games[gid] == null) return false;
	if (!(p24_games[gid].left_chance > 0)) return false;
	if (!check24(input, p24_games[gid].numbers)) return false;

	return true;
}

function guess24Solution(gid, input)
{
	//! previously called preGuess24Solution
	let correct = eval24(input, p24_games[gid].target);
	if (!correct)
	{
		--p24_games[gid].left_chance;
	}

	return correct;
}

function tryCreate24Game(gid, uid, target)
{
	if (target == null)
		throw Error('MelaiiBot-Plugin[p24]: target shouldn\'t be null');

	return create24Game(gid, uid, target, gen24);
}

function forceCreate24Game(gid, uid, target)
{
	if (target == null)
		throw Error('MelaiiBot-Plugin[p24]: target shouldn\'t be null');

	return create24Game(gid, uid, target, (e) => {
		let nums;
		while (nums = gen24(target), nums.length == 0);
		return nums;
	});
}

function get24GameSolution(gid)
{
	let game = p24_games[gid];
	if (game == null) return [];

	return calc24(game.target, game.numbers).slice(0, 4);
}

module.exports =
{
	get24GameInfo,
	remove24Game,
	preGuess24Solution,
	guess24Solution,
	tryCreate24Game,
	forceCreate24Game,
	get24GameSolution
};