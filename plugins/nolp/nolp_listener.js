"use strict";

const path = require('path');
const fs = require('fs');
const { cqcode } = require('oicq');
const parser = require('../../lib/parser');
const { writeFileSync, loadFileAsJson } = require('../../lib/filesys');
const { getKonachanSampleUrls, pickKonachanByTags, download } = require('./nolp');

const cmdDesc0 = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, './nolp.json'))
); //! .nolp

const cmdDesc1 = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, './nolp-package.json'))
); //! .nolp-package

function setup(field)
{
	const fnexplicit = path.resolve(__dirname, './explicit.tags'); //! 18R标签
	field.explicit_tags = loadFileAsJson(fnexplicit);
}

async function performDownload(event, downloadData)
{
	const url = downloadData.url;

	const maxRetry = 32;
	let retry = 0, result;

	this.trace('plugin.nolp: HTTPS GET:', url);
	do {
		let result = await download(url).then((resp) => {
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

async function performSend(event, sendData)
{
	const gid = event?.group_id;
	const uid = event?.user_id;

	const tag      = sendData.tag;
	const tagsdocs = sendData.tagsdocs;

	if (tag == null)
	{
		this.sendMsg('(Ｔ▽Ｔ)啊啊，梓言没有找到合适的图呀，要不你再试试？', { gid, uid });
	} else
	{
		let urls = getKonachanSampleUrls(tag), result;
		const fnpath = path.resolve(__dirname, `./cache/${Date.now()}.jpg`);

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

		switch (result.status)
		{
			case 0: //! 下载成功
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
			case 1: //! 图片丢失
				this.sendMsg('啊呀，图片找不到了。', { gid, uid });
			break;
			case 2: //! 网络问题
				this.sendMsg('网络状态不好，要不待会儿再看看吧？', { gid, uid });
			break;
		}
	}
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
		let tagsdocs = [this.getShared('nolp').explicit_tags];
		let tag = null;

		switch (subcmd.keyword)
		{
			case 'select':
				if (!subcmd.args._) break;
				let nolp_package = subcmd.args._[0].toLowerCase();
				if (nolp_package == 'explicit')
				{
					this.sendMsg('18R可是不被允许的，梓言不给你找图了！', { gid, uid });
					return false;
				}
				const fnpackage = path.resolve(__dirname, `${nolp_package}.tags`);
				if (fs.existsSync(fnpackage))
				{
					tagsdocs.push(loadFileAsJson(fnpackage));
				} else
				{
					this.sendMsg('选中的包不存在啦！我就按默认的给你找图咯~', { gid, uid });
				}
				tag = await pickKonachanByTags(tagsdocs);
				this.trace('plugin.nolp: 选中标签:', tag);
			break;
			default: //! 所有的freewords都被认为是include标签，用one模式匹配
				if (freewords.length == 0)
				{
					tag = await pickKonachanByTags(tagsdocs);
				} else
				{
					let tmpdesc = `plugin.nolp#${Math.ceil(Date.now())}#tmp`;
					let include_mode = 'one';
					if (argeles?.mode)
					{
						let guess = argeles.mode.args[0];
						if (['all', 'one'].includes(guess))
						{
							include_mode = guess;
						}
					}
					tagsdocs.push({ 'description': tmpdesc, 'include': {
						'mode': include_mode,
						'tags': freewords.map((e) => { return { 'keyword': e.word, 'desc': '???' } })
					}});
					tag = await pickKonachanByTags(tagsdocs);
					if (tag == null)
					{
						tag = await pickKonachanByTags(tagsdocs);
						try {
							fs.unlinkSync(path.resolve(__dirname, `${tmpdesc}.size`));
						} catch {};
					}
				}
				this.trace('plugin.nolp: 选中标签:', tag);
			break;
		}

		performSend.call(this, event, { tag, tagsdocs });

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
				this.trace(subcmd);
				let tagsdoclist = fs.readdirSync(path.resolve(__dirname, '.'))
				.filter((e) => {
					let index = e.indexOf('.tags');
					this.trace(1, e);
					return index != -1 && index == e.length - 5;
				}).map((e) => {
					this.trace(2, e);
					return {
						desc: loadFileAsJson(path.resolve(__dirname, e)).description,
						name: e.slice(0, -5)
					};
				}).map((e) => {
					this.trace(3, e);
					return `[${e.name}] ${e.desc}`;
				});
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