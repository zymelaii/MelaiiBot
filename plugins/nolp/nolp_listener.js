"use strict";

const path = require('path');
const fs = require('fs');
const { cqcode } = require('oicq');
const { writeFileSync, loadFileAsJson } = require('../../lib/filesys');
const utils = require('../../lib/utils');
const crypto = require('crypto');

const parser = require('../../lib/parser');

const nolp = require('./nolp');
const doc = require('./helpdoc');

const cmdDesc0 = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, './nolp.json'))
); //! .nolp

const cmdDesc1 = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, './nolp-package.json'))
); //! .nolp-package

async function indicateResultsCount(tagsdocs)
{	//! 获取筛选条件下结果总数
	let cache = this.getShared('nolp').count_cache;
	let str   = JSON.stringify(tagsdocs);
	let md5   = crypto.createHash('md5').update(str, 'utf-8').digest('hex');

	let count = cache[md5];
	if (count != null) return count;

	count = await nolp.countTags(tagsdocs); //! 获取结果总数
	cache[md5] = count; //! 缓存计数结果
	return count;
}

async function setup(field)
{
	const fnexplicit = path.resolve(__dirname, './data/explicit.tags'); //! 18R标签
	field.explicit_tags = loadFileAsJson(fnexplicit);

	const fntaginit = path.resolve(__dirname, './data/tags.def');
	if (!fs.existsSync(fntaginit))
	{	//! 初始化标签
		this.info('plugin.nolp.setup: 正在执行标签初始化');
		field.statistics = await nolp.scanTags();
		writeFileSync(fntaginit, JSON.stringify(field.statistics, null, 4), true);
		this.info('plugin.nolp.setup: 标签初始化完成');
	} else
	{
		field.statistics = loadFileAsJson(fntaginit);
	}

	field.count_cache = {}; //! 搜查结果总数缓存
	field.failed = []; //! 记录获取失败的图片uid
}

function uninstall()
{
	let field = this.getShared('nolp');

	const fnfailure = path.resolve(__dirname, './data/failure-list');
	let oldFailed = loadFileAsJson(fnfailure)?.data ?? [];
	let failed = [...new Set(field.failed.concat(oldFailed))];
	if (failed.length != 0)
	{	//! 存储失败图片数据
		// this.trace(failed);
		writeFileSync(fnfailure, JSON.stringify({ data: failed }, null, 4), true);
	}
}

async function performDownload(event, downloadData)
{
	const url = downloadData.url;

	const maxRetry = 32;
	let retry = 0, result;

	this.trace('plugin.nolp: HTTPS GET:', url);
	do {
		result = await nolp.download(url).then((resp) => {
			if (resp.length < 1024) return { status: 1/*图片丢失*/ };
			return { status: 0/*完成*/, data: resp };
		}).catch((e) => {
			return { status: 2/*网络错误*/, exception: e };
		});

		if (result.status == 2)
		{
			++retry;
		} else
		{
			return result;
		}
	} while (++retry < maxRetry);

	return result;
}

async function performPostSend(event, postSendData)
{
	const gid = event?.group_id;
	const uid = event?.user_id;

	const tag      = postSendData.tag;
	const tagsdocs = postSendData.tagsdocs;

	if (tag == null)
	{
		this.sendMsg('(Ｔ▽Ｔ)啊啊，梓言没有找到合适的图呀，要不你再试试？', { gid, uid });
	} else
	{
		let urls = [...nolp.tag2urls(tag, 'sample'), ...nolp.tag2urls(tag, 'preview')];
		let result = null;

		const fnpath = path.resolve(__dirname, `./cache/${tag.uid}`);

		if (!fs.existsSync(fnpath))
		{	//! 若图片缓存不存在，则尝试下载
			for (let i in urls)
			{
				result = await performDownload.call(this, event, { url: urls[i] });
				if (result.status == 0)
				{
					writeFileSync(fnpath, Buffer.from(result.data, 'binary'));
					break;
				} else if (result.status == 1)
				{
					continue;
				} else if (result.status == 2)
				{
					return;
				} else {
					//! Program should never reach here
					break;
				}
			}
		}

		switch (result?.status)
		{
			case 1: //! 图片丢失
				this.getShared('nolp').failed.push(tag.uid);
				this.sendMsg('啊呀，图片找不到了。', { gid, uid });
			break;
			case 2: //! 网络问题
				this.sendMsg('网络状态不好，要不待会儿再看看吧？', { gid, uid });
			break;
			case 0:  //! 下载成功
			default: //! 缓存存在
				let desctexts = [];
				for (let i in tagsdocs)
				{
					let content = tagsdocs[i]?.content ?? [];
					for (let j in content)
					{
						if (tag.tags.includes(content[j]?.keyword))
						{
							desctexts.push([content[j].keyword, content[j]?.desc ?? ''].join(' '));
						}
					}
				}
				this.sendMsg(cqcode.image(fnpath) + desctexts.join('\n'), { gid, uid });
			break;
		}
	}
}

async function performSend(event, sendData)
{
	const gid = event?.group_id;
	const uid = event?.user_id;

	const tagsdocs = [
		this.getShared('nolp').explicit_tags,
		...(sendData.tagsdocs ?? [])
	];

	let available = await indicateResultsCount.call(this, tagsdocs);
	if (available == 0)
	{
		this.sendMsg('没有找到匹配标签的图啦~', { gid, uid });
		return;
	}

	this.trace('plugin.nolp: available:', available);
	let tag = await nolp.pickKonachanByTags(tagsdocs, available);
	this.trace('plugin.nolp: 选中标签:', tag);

	await performPostSend.call(this, event, { tag, tagsdocs });
}

async function performSelect(event, selectData)
{
	const gid = event?.group_id;
	const uid = event?.user_id;

	const packages = selectData.packages ?? [];

	let tagsdocs = [];

	let done = 0;

	for (let i in packages)
	{
		if (packages[i] == 'explicit')
		{
			this.sendMsg('18R可是不被允许的，梓言不给你找图了！', { gid, uid });
			return;
		}
		const fnpackage = path.resolve(__dirname, `./data/${packages[i]}.tags`);
		if (fs.existsSync(fnpackage))
		{
			tagsdocs.push(loadFileAsJson(fnpackage));
			++done;
		}
	}

	if (done == 0)
	{
		this.sendMsg('选中的包不存在啦！我就按默认的给你找图咯~', { gid, uid });
	}

	await performSend.call(this, event, { tagsdocs });
}

async function performSelectTags(event, selectTagsData)
{
	let mode = selectTagsData.mode;
	let tags = selectTagsData.tags ?? [];

	if (!['all', 'one'].includes(mode)) mode = 'one';
	tags = tags.map((e) => {
		return { 'keyword': e.toLowerCase(), 'desc': '???' };
	});

	let tagsdocs = [];

	await performSend.call(this, event, {
		tagsdocs: tags.length == 0 ? [] : [{
			'description': '@temporary',
			'include': { mode, tags }
		}]
	});
}

async function performQuery(event, queryData)
{
	const gid = event?.group_id;
	const uid = event?.user_id;

	const shouldCheck  = queryData?.check  ?? true;
	const shouldSearch = queryData?.search ?? false;
	const tags         = [...new Set(queryData.tags ?? [])];

	if (tags.length == 0)
	{	//! 待查询标签不存在
		this.sendMsg('你需要查询什么呢？', { gid, uid });
		return;
	}

	if (!shouldCheck && !shouldSearch)
	{	//! 存在性检验与匹配相似至少存在一项
		this.sendMsg('你需要查询哪方面的内容呢？', { gid, uid });
		return;
	}

	const tagsdb = Object.keys(this.getShared('nolp').statistics);

	let tag_query_results = {};
	tags.forEach((e) => { tag_query_results[e] = { 'exist': false, 'similar': [] } });

	const maxMatch = 3;
	tagsdb.forEach((e) => {
		let word = String(e);
		if (shouldCheck)
		{
			let tag = tags.find((t) => t == word);
			if (tag != null)
			{
				tag_query_results[tag].exist = true;
			}
		}
		if (shouldSearch)
		{
			tags.forEach((tag) => {
				let difference = utils.strSimilarityByEditDistance(e, tag);
				let similar = tag_query_results[tag].similar;
				if (similar.length < maxMatch)
				{
					similar.push({ word, difference });
				} else
				{
					if (difference < similar[maxMatch - 1].difference)
					{
						similar[maxMatch - 1] = { word, difference };
					}
				}
				tag_query_results[tag].similar =
					similar.sort((a, b) => a.difference - b.difference);
			})
		}
	});

	let texts = [];
	for (let key in tag_query_results)
	{
		let result = tag_query_results[key];
		let text   = `[${key}] `;

		if (shouldCheck)
		{
			text += result.exist ? '存在' : '不存在';
		}

		if (shouldSearch)
		{
			if (shouldCheck) text += '，';
			let similars = result.similar.map((e) => e.word).filter((e) => e != key);
			text += `相似标签：${similars.join('，')}`;
		}

		texts.push(text);
	}

	this.sendMsg(texts.join('\n'), { gid, uid });
}

async function listener_0(event)
{	//! message
	//! .nolp
	const gid = event?.group_id;
	const uid = event?.user_id;

	if (event.raw_message[0] != '.') return true;
	const raw_cmd = event.raw_message.slice(1);

	return await parser.execute(raw_cmd, cmdDesc0,
	async (subcmd, argeles, freewords) => {
		switch (subcmd.keyword)
		{
			case 'help':   //! 帮助信息
				this.sendMsg(doc.HELP_NOLP, { gid, uid });
			break;
			case 'query':  //! 标签查询
				if (argeles.help)
				{
					this.sendMsg(doc.HELP_QUERY, { gid, uid });
				} else
				{
					performQuery.call(this, event, {
						check:  argeles?.check,
						search: argeles?.search,
						tags: freewords.map((e) => e.word.toLowerCase())
					});
				}
			break;
			case 'select': //! 图包选择
				if (argeles.help)
				{
					this.sendMsg(doc.HELP_SELECT, { gid, uid });
				} else
				{
					performSelect.call(this, event, {
						packages: freewords.map((e) => e.word)
					});
				}
			break;
			default:
				if (argeles.help)
				{
					this.sendMsg(doc.HELP_NOLP, { gid, uid });
				} else
				{	//! 标签选择
					performSelectTags.call(this, event, {
						mode: argeles?.mode ? argeles.mode.args[0] : 'one',
						tags: freewords.map((e) => e.word)
					});
				}
			break;
		}
		return false;
	}).catch((e) => {
		this.error(`plugin.nolp.nolp-sender: ${e.message}`);
		return true;
	}) ?? true;
}

async function listener_1(event)
{	//! message
	//! .nolp-package
	const gid = event?.group_id;
	const uid = event?.user_id;

	if (event.raw_message[0] != '.') return true;
	const raw_cmd = event.raw_message.slice(1);

	return await parser.execute(raw_cmd, cmdDesc1,
	async (subcmd, argeles, freewords) => {
		switch (subcmd.keyword)
		{
			case 'list':
				let tagsdoclist = fs.readdirSync(path.resolve(__dirname, './data'))
				.filter((e) => {
					let index = e.indexOf('.tags');
					return index != -1 && index == e.length - 5;
				}).map((e) => {
					return {
						desc: loadFileAsJson(path.resolve(__dirname, `./data/${e}`)).description,
						name: e.slice(0, -5)
					};
				}).map((e) => {
					return `[${e.name}] ${e.desc}`;
				}); //! 获取图包列表
				if (tagsdoclist.length == 0)
				{
					this.sendMsg('还没有添加图包呢~', { gid, uid });
				} else
				{
					this.sendMsg(`已经配置的图包：\n${tagsdoclist.join('\n')}`, { gid, uid });
				}
			break;
		}
		return false;
	}).catch((e) => {
		this.error(`plugin.nolp.nolp-package: ${e.message}`);
		return true;
	}) ?? true;
}

const description =
{
	plugin: 'nolp',
	setup,
	uninstall,
	actions: [{
		event: 'message',
		subname: 'nolp-sender',
		action: listener_0
	},{
		event: 'message',
		subname: 'nolp-man',
		action: listener_1
	}]
};

module.exports =
{
	description
};