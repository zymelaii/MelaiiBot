const { MelaiiBot } = require('../../lib/bot');
const { strSimilarityByEditDistance, asyncRequest } = require('../../lib/utils');
const { cqcode } = require('oicq');
const netease = require('./netease_api');
const fs = require('fs');
const parser = require('../../lib/parser');
const path = require('path')

const cmdDesc = parser.json2desc(
	fs.readFileSync(
		path.resolve(__dirname, 'music.json')
	).toString()
);

function performPlay(info, songid)
{
	const bot = info.bot;
	const gid = info.event.group_id;

	if (!songid)
	{
		bot.sendGroupMsg(gid, '呃啊啊，梓言还猜不到你的心思呢！你想要听什么歌曲呢？');
		return;
	}

	if (isNaN(Number(songid)))
	{
		bot.sendGroupMsg(gid, '唔呣……' + songid
			+ '好像不是一首歌的编号呢，那梓言就偷懒咯？d(´ω｀*)');
		return;
	}

	bot.sendGroupMsg(gid, cqcode.music('163', songid));
}

function performSearch(info, queryData)
{
	const bot = info.bot;
	const gid = info.event.group_id;
	const uid = info.event.sender.user_id;

	const songName = queryData.name;
	var   limit    = queryData.limit ? queryData.limit : 4;
	var   accept   = queryData.accept;
	const type     = 1;

	if (!songName)
	{
		bot.sendGroupMsg(gid, '呃啊啊，梓言还猜不到你的心思呢！你想要搜什么歌曲呢？');
		return;
	}

	bot.sendGroupMsg(
		gid, '梓言正在为你整理最火最精准的' + limit
		+ '首歌曲，请稍等哦！─=≡Σ(((つ•̀ω•́)つ');

	netease.asyncBatchSearch(songName, accept, type, async (data) => {

		if (data.status.code != 0)
		{
			bot.sendGroupMsg(gid, cqcode.at(uid)+ ' 搜索失败了。。（不要偷偷搞黄色哦~）');
			console.log('[WARN] Netease CloudMusic:',
				'failed searching (' + data.status.message + ')');
			return;
		}

		if (accept == null || accept > data.total) accept = data.total;
		if (limit > accept) limit = accept;

		var results = data.songs.map((e) => {
			return {
				name: e.name,
				id: e.id,
				artists: e.artists.map((e) => e.name).join('&'),
				popularity: 0,
				similarity: //最小编辑距离
					strSimilarityByEditDistance(e.name, songName)
			};
		});

		await netease.asyncGroupCountOfCommont(
			results.map((e) => e.id), (count_arr) => {
				for (let i in count_arr)
				{
					results[i].popularity = count_arr[i];
				}
			});

		results = results.sort((a, b) => a.similarity - b.similarity).slice(0, limit);
		results = results.sort((a, b) => b.popularity - a.popularity);

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

	try {
		parser.execute(raw_cmd, cmdDesc, (subcmd, argeles, freewords) => {

			if (!netease.isRunning())
			{
				bot.sendGroupMsg(gid, rejectReply);
				console.log('[INFO] 网易云音乐接口服务端未启动');
				return;
			}

			switch (subcmd.keyword)
			{
				case 'play':
					performPlay(info, subcmd.args?._?.valueOf(0));
				break;
				case 'search':
					performSearch(info, {
						name:   subcmd.args?._?.valueOf(0),
						limit:  argeles.limit?.args?.valueOf(0),
						accept: argeles.accept?.args?.valueOf(0)
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
		})
	} catch(e) {
		bot.sendGroupMsg(gid, '呃呃，出现火星文了啊！你想要说什么呢？');
		console.error('[ERROR]', e.message);
	}
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