"use strict"
const { getPermission } = require("../../lib/permission");
const { emptyDir } = require("../../lib/remove");
const { Data } = require("./Data");
const { segment } = require("oicq");
const parser = require('../../lib/parser');
const qmidi = require("quick-midi");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
let lastTime = Date.parse(new Date()) / 1000;
const cd = 10;
const help = `
[调教方法]
<-musicgen list>: 查看已保存的音乐
<-musicgen view 音乐名字>: 查看已保存的音乐乐谱
<-musicgen play 音乐名字>: 播放已保存的音乐
<-musicgen [Options] 乐谱>: 生成音乐,可选参数如下：
  -b, --bpm <正整数>: 音乐速度
  -s, --save <音乐名字> : 保存音乐
【乐谱不可有空格，可用|分割】 

[音长写法规则]
全音符: 1---
二分音符: 1-
附点二分音符: 1-- 或 1-*
四分音符: 1
三连音：1//2//3//
附点四分音符: 1*
八分音符: 1_
十六分音符: 1__

[音高写法规则]
'和.分别将音符升和降八度
#和b分别升和降半调
例：1为C4，1''为C6
当音高达到两个极限值时则会被切断

[注] 
※ 竖线|可出现在序列中的任何位置，相当于虚词，无实意，只是为了增加可读性，如分隔小节.
※ 修饰符位于一个音符之后。_将音符长度减半，n个连续的-和*分别将长度增加n和(1 - 1 / 2^n)倍。也就是说这三个修饰符分别相当于简谱中的下划线、横线和附点.
※ 修饰符会影响{}中的所有音符。比如{123}//和1//2//3//是等价的、{1234}_和1_2_3_4_是等价的.
※ 表示连音使用修饰符/，n个/将音符长度除以(n + 1).
`.trim();

const cmdDesc = parser.json2desc(
	fs.readFileSync(
		path.resolve(__dirname, 'musicgen.json')
	).toString()
);

async function performList(info)
{
	const bot   = info.bot;
	const event = info.event;

	let musicData = new Data();
	let nameList = musicData.getMusicName();

	if (nameList.length == 0)
	{
		event.reply('我的音乐书空空如也~');
	} else
	{
		event.reply(`音乐书曲目：[${nameList.join('|')}]`);
	}
}

async function performView(info, viewData)
{
	const bot   = info.bot;
	const event = info.event;

	const scoreName = viewData.score;

	if (!scoreName)
	{
		event.reply('你想要看哪首乐谱啊？');
		return;
	}

	let musicData = new Data();
	let nameList = musicData.getMusicName();

	if (nameList.indexOf(scoreName) == -1)
	{
		event.reply('音乐本中暂无该曲目');
		return;
	}

	let m = musicData.getMusic(scoreName);
	event.reply(m.slice(1 + m.indexOf('|')));
}

async function performPlay(info, playData)
{
	const bot   = info.bot;
	const event = info.event;

	const scoreName = playData.score;

	if (!scoreName)
	{
		event.reply('你想要看哪首乐谱啊？');
		return;
	}

	let musicData = new Data();
	let nameList = musicData.getMusicName();

	if (nameList.indexOf(scoreName) == -1)
	{
		event.reply('窝不会唱~你教我呗');
		return;
	}

	let genRes = genMidi(
		musicData.getMusic(scoreName),
		String(event.time));

	if (!genRes.res)
	{
		event.reply(genRes.errMsg);
		return;
	}

	lastTime = event.time;
	await sendMusic(event);
}

async function performGenerate(info, generataData)
{
	const bot   = info.bot;
	const event = info.event;

	const savefile  = generataData.savefile;
	const bpm       = generataData.bpm ? generataData.bpm : 120;
	let   score     = generataData.score;

	score = score.replace(/i{(.*?)}/g, `\\instrument{$1}`);
	score = score.replace(/m{(.*?)}/g, `\\major{$1}`);

	const fullScore = `\\bpm{${bpm}}${score}`

	console.log(`[INFO] plugin.musicgen: ${fullScore}`);

	let genRes = genMidi(fullScore, String(event.time));
	if (!genRes.res)
	{
		event.reply(genRes.errMsg);
		return;
	}

	lastTime = event.time;

	if (savefile)
	{
		new Data().updateMusic(savefile, fullScore);
	}

	await sendMusic(event);
}

async function musicgen(info)
{
	const bot   = info.bot;
	const event = info.event;
	const uid   = event.user_id;

	if (event.raw_message[0] != '.') return;
	const raw_cmd = event.raw_message.slice(1);

	if (/*!await getPermission(event, "musicgen")*/false)
	{
		console.warn(`[WARN] user ${uid} has no permission to execute plugin.musicgen`);
		return;
	}

	if (event.time - lastTime - cd < 1e-5)
	{
		console.log(`[INFO] plugin.musicgen is on CD (${Math.max(event.time - lastTime, 0)} seconds left)`);
		return;
	}

	parser.execute(raw_cmd, cmdDesc, async (subcmd, argeles, freewords) => {

		console.log('[INFO] subcmd:', subcmd);
		console.log('[INFO] argeles:', argeles);
		console.log('[INFO] freewords:', freewords);

		if (argeles.help)
		{
			event.reply(help);
			return;
		}

		switch (subcmd.keyword)
		{
			case 'list':
				performList({ bot: bot, event: event });
			break;
			case 'view':
				performView({ bot: bot, event: event }, {
					score: subcmd.args ? subcmd.args._[0] : null
				});
			break;
			case 'play':
				performPlay({ bot: bot, event: event }, {
					score: subcmd.args._ ? subcmd.args._[0] : null
				});
			break;
			default:
				let score = freewords.map((e) => e.word).join('');
				if (score == '')
				{
					event.reply(help);
					return;
				}
				performGenerate({ bot: bot, event: event }, {
					score: score,
					bpm: argeles.bpm ? argeles.bpm.args[0] : null,
					savefile: argeles.save ? argeles.save.args[0] : null
				});
			break;
		}
	}).catch((e) => {
		console.log(`[ERROR] ${e.message}`);
	});
}
exports.musicgen = musicgen;

function genMidi(input, name) {
	let info = { res: false, errMsg: null };
	let ctx = qmidi.createContext();

	let midiFile = ctx.parse(input);

	let errors = ctx.getErrors();
	if (ctx.hasError()) {
		info.errMsg = `谱子有误，你是不是多写了【${errors[0]["range"]["text"]}】?`;
		return info;
	}
	else {
		let midiData = qmidi.saveMidiFile(midiFile);
		if (!fs.existsSync(path.join(__dirname, './cache'))) fs.mkdirSync(path.join(__dirname, './cache'));
		fs.writeFileSync(path.join(__dirname, `./cache/${name}.mid`), Buffer.from(midiData))
		info.res = true;
		return info;
	}
}

async function sendMusic(event) {
	let ls = spawn('java', [
		'-jar',
		path.join(__dirname, "./midi2wav.jar"),
		path.join(__dirname, `./cache/${String(event.time)}.mid`),
		path.join(__dirname, "./cache/")]);

	ls.on('close', async (code) => {
		await event.reply([
			segment.record(
				path.join(__dirname, `./cache/${String(event.time)}.wav`))
			]);
		let files = fs.readdirSync(path.join(__dirname, "./cache"));
		if (files.length > 4) {
			emptyDir(path.join(__dirname, "./cache"));
		}
	});
}

const description = {
	plugin: 'musicgen',
	actions: [{
		event: 'message.group.normal',
		subname: 'core',
		action: musicgen
	}]
};

module.exports =
{
	description
};