const { MelaiiBot } = require('../../lib/bot');
const { strSimilarityByEditDistance, asyncRequest } = require('../../lib/utils');
const { cqcode } = require('oicq');

const netease = require('./netease_api');

function listener_0(info)
{	//@message.group.normal

	const bot = info.bot;
	const event = info.event;
	const msg = info.msg;

	var index = msg.cmd.map(e => e.cmd).indexOf('music');
	if (index == -1) return;

	const gid = event.group_id;
	const uid = event.sender.user_id;

	if (event.raw_message == '这个东西我还没学会，哼！') return;

	if (!netease.isRunning())
	{
		bot.sendGroupMsg(gid, '这个东西我还没学会，哼！');
		console.log('[INFO] 网易云音乐接口服务器未启动');
		return;
	}

	var argv = msg.cmd[index].argv;
	if (argv.length == 0) return;

	let subcmd = argv[0];

	switch (subcmd)
	{
		case 'search':
		{
			if (argv.length < 2)
			{
				bot.sendGroupMsg(gid, '呃啊啊，梓言还猜不到你的心思呢！你想要搜什么歌曲呢？');
				return;
			}

			let accept = null; //最大搜索数量（默认接受全部搜索结果）
			let limit = 4;  //最大反馈数量

			let index = -1;

			let songname = argv[1];

			index = argv.indexOf('--accept');
			if (index != -1 && index + 1 < argv.length)
			{
				if (!isNaN(Number(argv[index + 1])))
				{
					accept = Number(argv[index + 1]);
				}
			}

			index = argv.indexOf('--limit');
			if (index != -1 && index + 1 < argv.length)
			{
				if (!isNaN(Number(argv[index + 1])))
				{
					limit = Number(argv[index + 1]);
				}
			}

			bot.sendGroupMsg(
				gid, '梓言正在为你整理最火最精准的' + limit
				+ '首歌曲，请稍等哦！─=≡Σ(((つ•̀ω•́)つ');

			netease.asyncBatchSearch(songname, accept, 1, async (data) => {

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
							strSimilarityByEditDistance(e.name, songname)
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
		break;
		case 'play':
		{
			if (argv.length < 2)
			{
				bot.sendGroupMsg(gid, '呃啊啊，梓言还猜不到你的心思呢！你想要听什么歌曲呢？');
				return;
			}

			if (isNaN(Number(argv[1])))
			{
				bot.sendGroupMsg(gid, '唔呣……' + argv[1]
					+ '好像不是一首歌的编号呢，那梓言就偷懒咯？d(´ω｀*)');
				return;
			}

			bot.sendGroupMsg(gid, cqcode.music('163', argv[1]));
		}
		break;
		default:
		{
			bot.sendGroupMsg(gid, '点歌就点歌，我可不知道`' + subcmd + '`是什么意思呢！');
		}
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