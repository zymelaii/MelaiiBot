const request = require('sync-request');
const { asyncRequest } = require('../../lib/utils');

var is_proxy_running = false;

function httpGet(url)
{
	url = encodeURI(url)
	return request('GET', url);
}

function isRunning()
{
	if (!is_proxy_running)
	{
		try {
			let url = 'http://localhost:3000/login/status';
			let resp = JSON.parse(httpGet(url).getBody('utf8'));
			if (resp.data.code == 200)
			{
				is_proxy_running = true;
			}
		} catch(e) {
			console.log('[ERROR] ' + e.message);
		}
	} else
	{
		return true;
	}

	return is_proxy_running;
}

function countOfComment(id)
{
	let url = 'http://localhost:3000/comment/music?id=' + id + '&limit=1';
	let count = 0;
	try {
		count = JSON.parse(httpGet(url).getBody('utf8')).total;
	} catch {
		//TODO
	}
	return count;
}

async function asyncGroupCountOfCommont(id_arr, resolve)
{
	let url = 'http://localhost:3000/comment/music?limit=1&id=';
	let count_arr = new Array(id_arr.length);
	for (let i in id_arr)
	{
		try {
			asyncRequest(url + id_arr[i], (resoponse) => {
				try {
					count_arr[i] = JSON.parse(response).total;
				} catch {
					count_arr[i] = 0;
				}
			});
		} catch(e) {
			console.log('[ERROR] asyncGroupCountOfCommont('
				+ i +') failed (' + e.message + ')');
		}
	}
	resolve(count_arr.slice(0));
}

function search(name, limit, type)
{
	let url = 'http://localhost:3000/search?keywords=';

	url += name;

	if (limit != null && limit != 0) url += '&limit=' + limit;
	if (type != null) url += '&type=' + type;

	return JSON.parse(httpGet(url).getBody('utf8'));
}

async function asyncSearch(name, limit, type, resolve)
{
	let url = 'http://localhost:3000/search?keywords=';

	url += name;

	if (limit != null && limit != 0) url += '&limit=' + limit;
	if (type != null) url += '&type=' + type;
	if (offset != null) url += '&offset=' + offset;

	await asyncRequest(url, (response) => {
		try {
			resolve(JSON.parse(response));
		} catch(e) {
			console.log('[ERROR] netease_api.asyncSearch:', e.message);
		}
	});
}

async function asyncBatchSearch(name, limit, type, resolve)
{
	if (type == null) type = 1;

	// const onceMaxCount = 100; //单次最大下载量
	const onceMaxCount = 30;

	let url = 'http://localhost:3000/search?';
	url += 'keywords=' + name;
	url += '&type=' + type;

	let totalCount = null;
	try {
		totalCount = search(name, 1, type).result.songCount;
		console.log('[INFO] netease_api.asyncBatchSearch:',
			totalCount, 'songs available');
	} catch(e) {
		totalCount = 0;
		resolve({
			status: {
				code: 1, //failed
				message: 'no available search results (' + e.message + ')'
			},
			songs: [],
			total: totalCount
		});
		return;
	};

	if (limit == null || limit > totalCount) limit = totalCount;

	let limitSlice = []; //任务分配
	while (limit > onceMaxCount)
	{
		limitSlice.push(onceMaxCount);
		limit -= onceMaxCount;
	}
	limitSlice.push(limit);

	var songs = []; //此处未加锁，可能出现错误！

	var workers = [];
	const appendData = (data) => {
		let new_songs = data.result.songs;
		songs = songs.concat(new_songs.slice(0));
		// console.log('[INFO] netease_api.asyncBatchSearch: completed '
		// 	+ new_songs.length + ' items');
	};

	for (let i = 0; i < limitSlice.length; ++i)
	{
		thisUrl = url
			+ '&limit=' + limitSlice[i]
			+ '&offset=' + onceMaxCount * i;
		workers.push(asyncRequest(thisUrl, (response) => {
			try {
				appendData(JSON.parse(response));
			} catch(e) {
				console.log('[ERROR] netease_api.asyncBatchSearch: ['
					+ i + '] ' + e.message);
			}
		}));
	}

	Promise.all(workers).then((e) => {
		resolve({
			status: {
				code: 0,
				message: 'success'
			},
			songs: songs,
			total: totalCount
		});
	});
}

module.exports =
{
	isRunning,
	countOfComment,
	asyncGroupCountOfCommont,
	search,
	asyncSearch,
	asyncBatchSearch
};