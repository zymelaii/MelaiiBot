"use strict";

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { randomInt, asyncRequest } = require('../../lib/utils');
const { writeFileSync } = require('../../lib/filesys');
const https = require('https');

// https.globalAgent.keepAlive = true;
// https.globalAgent.maxSockets = 8;

const FN_KONACHANDB = path.resolve(__dirname, './data/konachan.db.txt');

/// 统计标签种类与数目
async function scanTags()
{
	const rl = readline.createInterface({
		input: fs.createReadStream(FN_KONACHANDB)
	});

	let statistics = {};

	for await (const line of rl)
	{
		let tag = JSON.parse(line);
		tag.tags.forEach((e) => {
			if (!statistics[e])
			{
				statistics[e] = 0;
			}
			++statistics[e];
		});
	}

	return statistics;	
}

function checkTag(tag, tagsdoc)
{
	if (tagsdoc == null) return true;

	const tags = tag.tags;
	const include = tagsdoc?.include;
	const exclude = tagsdoc?.exclude;

	if (include == null && exclude == null)
	{
		// console.log('NULL INC&EXC');
		return true;
	}

	if (exclude?.mode == 'one')
	{
		for (let i in exclude.tags)
		{
			if (tags.includes(exclude.tags[i].keyword))
			{
				return false;
			}
		}
	}

	if (exclude?.mode == 'all')
	{
		let hasall = true;
		for (let i in exclude.tags)
		{
			if (!tags.includes(exclude.tags[i].keyword))
			{
				hasall = false;
				break;
			}
		}
		if (hasall) return false;
	}

	if (include?.mode == 'one')
	{
		for (let i in include.tags)
		{
			if (tags.includes(include.tags[i].keyword))
			{
				// console.log('INCLUDE ONE:', include.tags[i].keyword);
				return true;
			}
		}
		return false;
	}

	if (include?.mode == 'all')
	{
		for (let i in include.tags)
		{
			if (!tags.includes(include.tags[i].keyword))
			{
				return false;
			}
		}
		// console.log('INCLUDE ALL');
		return true;
	}

	// console.log('ALL:', include, exclude);
	return true;
}

/// 获取指定标签的图片数量
async function countTags(tagsdocs)
{
	const rl = readline.createInterface({
		input: fs.createReadStream(FN_KONACHANDB)
	});

	let collect = 0;
	for await (const line of rl)
	{
		let tag = JSON.parse(line), done = true;
		for (let i in tagsdocs)
		{
			if (!checkTag(tag, tagsdocs[i]))
			{
				done = false;
				break;
			}
		}

		if (done) ++collect;
	}

	return collect;
}

async function pickKonachanByTags(tagsdocs, imax = null)
{
	let max_tags_count = !isNaN(imax) && Number(imax) > 0 ? Number(imax) : 10000;
	let selectAt = randomInt(0, max_tags_count);

	const rl = readline.createInterface({
		input: fs.createReadStream(FN_KONACHANDB)
	});

	let lineIndex = 0, tag = null;
	let collect = 0;

	for await (const line of rl)
	{
		tag = JSON.parse(line);

		let done = true;
		for (let i in tagsdocs)
		{
			if (!checkTag(tag, tagsdocs[i]))
			{
				done = false;
				break;
			}
		}

		if (!done)
		{
			tag = null;
			continue;
		}

		++collect;
		if (collect >= selectAt)
		{
			break;
		}
	}

	rl.close();
	return tag;
}

/// @param: type: 'origin'|'sample'|'preview'
function tag2urls(tag, type = 'sample')
{
	const uid    = tag.uid;
	const id     = tag.id;
	const format = tag.format;
	const tags   = tag.tags;

	let src_url, urls = [];
	switch (type)
	{
		case 'origin':
			src_url = `https://konacha1n.net/image/${uid}/Konachan.com - ${id} ${tags.join(' ')}.${format}`;
			src_url = Buffer.from(encodeURI(src_url)).toString('base64');
			urls.push('http://konachan.zju.link/konachan_download_static/' + src_url);
			return urls;
		break;
		case 'sample':
			urls.push(`sample/${uid}/Konachan.com - ${id} sample.jpg`);
			urls.push(`jpeg/${uid}/Konachan.com - ${id} ${tags.join(' ')}.jpg`);
			urls = urls.map((e) => encodeURI(`https://konachan.net/${e}`));
			return urls;
		break;
		case 'preview':
			src_url = `https://konachan.net/data/preview/${uid.slice(0, 2)}/${uid.slice(2, 4)}/${uid}.jpg`;
			urls.push(encodeURI(src_url));
			return urls;
		break;
	}

	return urls; //! empty
}

function download(url)
{
	return new Promise((resolve, reject) => {
        https.get(url, (req, res) => {
            let data = '';
            req.setEncoding('binary');
            req.on('response', (resp) => {
            	console.log(resp);
            });
            req.on('data', (chunk) => {
            	// console.log(`HTTPS GET: receive ${chunk.length} bytes`);
            	data += chunk;
            });
            req.on('end', () => {
            	// console.log(`HTTPS GET: done`);
            	resolve(data);
			});
        }).on('error', (e) => {
        	// console.log(`HTTPS GET: error:`, e.message);
        	reject(e);
        });
    });
}

module.exports =
{
	pickKonachanByTags,
	tag2urls,
	download,
	countTags,
	scanTags
};