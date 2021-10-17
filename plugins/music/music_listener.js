"use strict";

const { MelaiiBot } = require('../../lib/bot');
const { cqcode } = require('oicq');
const { strSimilarityByEditDistance } = require('../../lib/utils');
const netease = require('./netease_api');
const { selectNBestSongs } = require('./music');
const fs = require('fs');
const parser = require('../../lib/parser');
const path = require('path');

const cmdDesc = parser.json2desc(
	fs.readFileSync(
		path.resolve(__dirname, 'music.json')
	).toString()
);

async function performPlay(info, playData)
{
	const bot = info.bot;
	const gid = info.event.group_id;

	let songid = playData.keyword;
	const isname = playData.isname;

	if (!songid)
	{
		bot.sendGroupMsg(gid, '呃啊啊，梓言还猜不到你的心思呢！你想要听什么歌曲呢？');
		return;
	}

	if (!isNaN(Number(songid)))
	{
		bot.sendGroupMsg(gid, cqcode.music('163', songid));
		return;
	}

	if (!isname)
	{
		bot.sendGroupMsg(gid, '唔呣……' + songid
			+ '好像不是一首歌的编号呢，那梓言就偷懒咯？d(´ω｀*)');
		return;
	}

	const name   = playData.keyword;
	const accept = 64;
	const limit  = 1;
	const type   = 1;

	netease.batchSearch(name, accept, type)
		.then(async (data) => {
			if (data.status.code != 0) throw null;
			if (data.total == 0) throw null;
			songid = (await selectNBestSongs(name, data.songs, limit))[0].id;
			bot.sendGroupMsg(gid, cqcode.music('163', songid));
		}).catch((e) => {
			console.log(`[ERROR] batchSearch: ${e.message}`);
			bot.sendGroupMsg(gid, `找不到歌曲${name}，播放失败了哇！`);
		});
}

async function performSearch(info, queryData)
{
	const bot = info.bot;
	const gid = info.event.group_id;
	const uid = info.event.sender.user_id;

	const songName = queryData.name;
	var   limit    = queryData.limit ? queryData.limit : 4;
	var   accept   = queryData.accept;
	const type     = 1;

	if (accept != null && limit > accept) limit = accept;

	if (!songName)
	{
		bot.sendGroupMsg(gid, '呃啊啊，梓言还猜不到你的心思呢！你想要搜什么歌曲呢？');
		return;
	}

	bot.sendGroupMsg(
		gid, `梓言正在为你整理最火最精准的${limit}首歌曲，请稍等哦！─=≡Σ(((つ•̀ω•́)つ`);

	netease.batchSearch(songName, accept, type).then(async (data) => {

		const failed_msg = cqcode.at(uid)+ ' 搜索失败了。。（不要偷偷搞黄色哦~）';

		if (data.status.code != 0)
		{
			bot.sendGroupMsg(gid, failed_msg);
			console.log('[WARN] Netease CloudMusic:',
				'failed searching (' + data.status.message + ')');
			return;
		}

		if (accept == null || accept > data.total) accept = data.total;
		if (limit > accept) limit = accept;

		console.log(`[INFO] music: accept: ${accept} limit: ${limit}`);

		var results = await selectNBestSongs(songName, data.songs, limit);
		if (!results)
		{
			bot.sendGroupMsg(gid, failed_msg);
			return;
		}

		let text = results.map((e) =>
			String(e.id).padEnd(12) + e.name + ' - ' + e.artists).join('\n');

		bot.sendGroupMsg(
			gid, cqcode.at(uid)+ ' 你的搜歌结果出炉啦！\n' + text);
	});
}

function listener_0(info)
{	//@message.group.normal
	const bot   = info.bot;
	const event = info.event;
	const gid   = event.group_id;

	if (event.raw_message[0] != '.') return;
	const raw_cmd = event.raw_message.slice(1);

	const rejectReply = '这个东西我还没学会，哼！';

	if (event.raw_message == rejectReply) return;

	parser.execute(raw_cmd, cmdDesc, async (subcmd, argeles, freewords) => {
		if (!await netease.isRunning())
		{
			bot.sendGroupMsg(gid, rejectReply);
			console.log('[INFO] 网易云音乐接口服务端未启动');
			return;
		}

		switch (subcmd.keyword)
		{
			case 'play':
				performPlay(info, {
					keyword: subcmd.args._ ? subcmd.args._[0] : null,
					isname: argeles.name ? true : false
				});
			break;
			case 'search':
				performSearch(info, {
					name:   subcmd.args._  ? subcmd.args._[0]       : null,
					limit:  argeles.limit  ? argeles.limit.args[0]  : null,
					accept: argeles.accept ? argeles.accept.args[0] : null
				});
			break;
			default:
				if (argeles.help)
				{
					bot.sendGroupMsg(gid, parser.compoundHelpInfo(cmdDesc));
				} else if (freewords[0] && freewords[0].index == 0)
				{
					bot.sendGroupMsg(gid,
						'点歌就点歌，我可不知道`' + freewords[0].word + '`是什么意思呢！');
				} else
				{
					bot.sendGroupMsg(gid, '找梓言，是想要嗨歌吗？');
				}
			break;
		}
	}).catch((e) => {
		bot.sendGroupMsg(gid, '呃呃，出现火星文了啊！你想要说什么呢？');
		console.error('[ERROR]', e.message);
	})
}

const description = {
	plugin: 'music',
	actions: [{
		event: 'message.group.normal',
		subname: 'netease',
		action: listener_0
	}]
};

module.exports =
{
	description
};