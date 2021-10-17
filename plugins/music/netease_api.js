"use strict"

const request = require('sync-request');
const { asyncRequest } = require('../../lib/utils');
const { exec } = require('child_process');
const path = require('path');

var is_proxy_running = false;

async function isRunning()
{
	if (is_proxy_running) return true;

	let url = 'http://localhost:3000/login/status';
	return (async () => {
		is_proxy_running = await asyncRequest(url)
			.then((e) => {
				console.log('[INFO] netease_api.isRunning:', e);
				return true;
			})
			.catch((e) => {
				console.error(`[ERROR] ${e.message}`);
				return false;
			});
		return is_proxy_running;
	})();
}

async function startServer()
{
	if (!await isRunning())
	{
		const app_path = path.resolve(__dirname, 'NeteaseCloudMusicApi/app.js');
		exec(`node ${app_path}`);
	}
}

async function countOfComment(id)
{
	let url = 'http://localhost:3000/comment/music?id=' + id + '&limit=1';
	return (async () => {
		let resp = await asyncRequest(url);
		try { return JSON.parse(resp).total; } catch { return 0; }
	})()
}

async function batchCountOfComment(id_arr)
{
	let url = 'http://localhost:3000/comment/music?limit=1&id=';
	let workers = [];
	id_arr.forEach((e) => {
		workers.push((async (e) => {
			let resp = await asyncRequest(url + e);
			try { return JSON.parse(resp).total; } catch { return 0; }
		})(e));
	});
	return Promise.all(workers);
}

async function search(name, limit, type, offset)
{
	let url = 'http://localhost:3000/search?keywords=';

	url += name;

	if (limit  != null && limit != 0) url += '&limit=' + limit;
	if (type   != null) url += '&type=' + type;
	if (offset != null) url += '&offset=' + offset;

	return (async () => {
		try {
			let resp = await asyncRequest(url);
			return JSON.parse(resp);
		} catch(e) {
			console.error(`[ERROR] netease_api.search: ${e.message}`)
			return null;
		}
	})();
}

async function batchSearch(name, limit, type)
{
	if (type == null) type = 1;

	const onceMaxCount = 30;

	let url = 'http://localhost:3000/search?';
	url += 'keywords=' + name;
	url += '&type=' + type;

	let totalCount = null;
	let errmsg = null;
	try {
		let result = (await search(name, 1, type)).result;
		totalCount = result?.songCount;
		if (totalCount == 0)
		{
			if (result.songs.length != 0) totalCount = result.songs.length;
			if (totalCount == 0) totalCount = null;
		}
		console.log('[INFO] netease_api.asyncBatchSearch:',
				Number(totalCount), 'songs available');
	} catch(e) {
		totalCount = null;
		errmsg = e.message;
	};

	if (totalCount == null)
	{
		return {
			status: {
				code: 1, //failed
				message: 'no available search results'
					+ (errmsg ? `(${errmsg})` : '')
			},
			songs: [],
			total: totalCount
		};
	}

	if (limit == null || limit > totalCount) limit = totalCount;

	let limitSlice = []; //任务分配
	while (limit > onceMaxCount)
	{
		limitSlice.push(onceMaxCount);
		limit -= onceMaxCount;
	}
	limitSlice.push(limit);

	var workers = [];
	var thisCount;
	for (let i = 0; i < limitSlice.length; ++i)
	{
		let thisUrl = url
			+ '&limit=' + limitSlice[i]
			+ '&offset=' + onceMaxCount * i;
		workers.push((async () => {
			let resp = await asyncRequest(thisUrl);
			return JSON.parse(resp).result.songs;
		})());
	}

	return (async () => {
		var songs_arr = await Promise.all(workers);
		var songs = [];
		songs_arr.forEach((e) => { songs = songs.concat(e) });
		return {
			status: {
				code: 0,
				message: 'success'
			},
			songs: songs,
			total: totalCount
		};
	})();
}

// startServer();

module.exports =
{
	isRunning,
	startServer,
	countOfComment,
	batchCountOfComment,
	search,
	batchSearch
};