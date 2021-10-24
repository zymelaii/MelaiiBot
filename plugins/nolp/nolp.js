"use strict";

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { randomInt, asyncRequest } = require('../../lib/utils');
const { writeFileSync } = require('../../lib/filesys');
const https = require('https');

// https.globalAgent.keepAlive = true;
// https.globalAgent.maxSockets = 8;

const FN_KONACHANDB = path.resolve(__dirname, './konachan.db.txt');

async function randomPickKonachan(whitetags = [], blacktags = [])
{
	let start = randomInt(0, 10/*240000*/); //! 确定起始行
	const rl = readline.createInterface({
		input: fs.createReadStream(FN_KONACHANDB)
	});

	let lineIndex = 0, tag = null;
	for await (const line of rl)
	{
		if (++lineIndex < start) continue;

		tag = JSON.parse(line);
		let done = true;
		for (let i in tag.tags)
		{
			if (blacktags.includes(tag.tags[i]))
			{
				done = false;
				tag = null;
				break;
			}
		}
		if (!done) continue;
		done = false;
		for (let i in whitetags)
		{	//! 若白名单不存在，则忽略
			//! 否则只要存在一条，即获取
			if (tag.tags.includes(whitetags[i]))
			{
				done = true;
				break;
			}
		}
		if (done || whitetags.length == 0) break;
	}
	rl.close();

	return tag;
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

async function pickKonachanByTags(tagsdocs)
{
	let fnsize = path.resolve(__dirname, `./${tagsdocs.slice(-1)[0].description}.size`);
	let max_tags_count = 10000;
	if (fs.existsSync(fnsize))
	{
		max_tags_count = Number(fs.readFileSync(fnsize).toString());
	}
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

	if (collect > 0 && tag == null)
	{
		writeFileSync(fnsize, collect.toString());
	}

	rl.close();
	return tag;
}

/// @param: type: 'origin'|'sample'|'preview'
function parseKonachanImageTag2CHSUrl(tag, type = 'sample')
{
	const uid    = tag.uid;
	const id     = tag.id;
	const format = tag.format;
	const tags   = tag.tags;

	let src_url, url;
	switch (type)
	{
		case 'origin':
			src_url = `https://konacha1n.net/image/${uid}/Konachan.com - ${id} ${tags.join(' ')}.${format}`;
			src_url = Buffer.from(encodeURI(src_url)).toString('base64');
			url = 'http://konachan.zju.link/konachan_download_static/' + src_url;
			return url;
		break;
		case 'sample':
			src_url = `https://konachan.net/sample/${uid}/Konachan.com - ${id} sample.jpg`;
			url = encodeURI(src_url);
			return url;
		break;
		case 'preview':
			src_url = `https://konachan.net/data/preview/${uid.slice(0, 2)}/${uid.slice(2, 4)}/${uid}.jpg`;
			url = encodeURI(src_url);
			return url;
		break;
		default: return null;
	}
}

function getKonachanSampleUrls(tag)
{
	const uid    = tag.uid;
	const id     = tag.id;
	const format = tag.format;
	const tags   = tag.tags;

	let urls = [];
	urls.push(`/sample/${uid}/Konachan.com - ${id} sample.jpg`);
	urls.push(`/jpeg/${uid}/Konachan.com - ${id} ${tags.join(' ')}.jpg`);
	urls = urls.map((e) => encodeURI(`https://konachan.net/${e}`));

	return urls;
}

function download(url)
{
	return new Promise((resolve,reject) => {
        https.get(url, (req, res) => {
            let html = '';
            req.setEncoding('binary');
            req.on('data', (chunk) => {
            	// console.log(`HTTPS GET: receive ${chunk.length} bytes`);
            	html += chunk;
            });
            req.on('end', () => {
            	// console.log(`HTTPS GET: done`);
            	resolve(html);
			});
        }).on('error', (e) => {
        	// console.log(`HTTPS GET: error:`, e.message);
        	reject(e);
        });
    });
}

module.exports =
{
	randomPickKonachan,
	pickKonachanByTags,
	parseKonachanImageTag2CHSUrl,
	getKonachanSampleUrls,
	download
};