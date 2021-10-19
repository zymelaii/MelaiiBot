"use strict";

const path = require('path');
const parser = require('../../lib/parser');
const { initialize } = require('./hush-battle');
const { loadFileAsJson } = require('../../lib/filesys');
const { HBManager } = require('./manager');
const doc = require('./helpdoc');

const cmdDesc = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, 'hush-battle.json'))
);

async function performInit(info, overwrite)
{
	const bot   = info.bot;
	const event = info.event;
	const gid   = event.group_id;

	if (overwrite && event.user_id != 1745096608)
	{
		bot.sendGroupMsg('[系统消息] 权限不足');
		return;
	}

	let userlist = []
	let memlist = await bot.getGroupMemberList(gid);
	memlist.data.forEach((e) => {
		userlist.push({ uid: e.user_id, nickname: e.nickname });
	});

	let status = initialize(gid, userlist, overwrite);
	switch (status)
	{
		case -1: bot.sendGroupMsg(gid, `[系统消息] 服务器 ${gid} 创建失败`); break;
		case  0: bot.sendGroupMsg(gid, `[系统消息] 服务器 ${gid} 创建成功`); break;
		case  1: bot.sendGroupMsg(gid, `[系统消息] 服务器 ${gid} 已存在`); break;
		case  2: bot.sendGroupMsg(gid, `[系统消息] 服务器 ${gid} 已重置`); break;
		default:
			bot.error('plugin.hush-battle.performInit: unexpected branch entry');
			break;
	}

	if (status != 0 || status != 2)
	{	//! 重启
		bot.getShared('hush-battle').Manager = new HBManager;
	}
}

async function performList(info, listData)
{
	const bot   = info.bot;
	const event = info.event;
	const gid   = event.group_id;

	const man    = bot.getShared('hush-battle').Manager;
	const target = listData.target;

	let text;

	switch (target)
	{
		case 'server':
			text = '服务器列表：';
			const servers = man.servers;
			servers.forEach((e, i) => {
				let sid      = e.sid.toString().padEnd(10);
				let name     = e.name;
				let isActive = man.isOpened(e.sid);
				text += `\n【${i + 1}】 ${sid} ${name}（${isActive ? '活跃' : '待机'}）`;
			});
			bot.sendGroupMsg(gid, text);
		break;
		case 'role':
			let roles = man.openServer(gid)._rolelist.map((e) => {
				return {
					/*uid: e.uid,*/
					nickname: e.nickname,
					level: e.level,
					experience: e.info.experience
				};
			});

			roles = roles.sort((a, b) => {
				return a.level == b.level
					? b.experience - a.experience
					: b.level - a.level;
			});

			let remain = Math.max(0, roles.length - 8);
			let rank = 0;

			text = '玩家列表：\n' + roles.map((e) =>
				`【${++rank}】 Lv.${e.level} ${e.nickname}`)
				.slice(0, 8).join('\n');

			text = text.trim();
			if (remain > 0) text += `\n已忽略 ${remain} 条记录`;
			bot.sendGroupMsg(gid, text);
		break;
		default:
			bot.sendGroupMsg(gid, '[系统消息] 命令已否决');
			return;
	}
}

async function performView(info, viewData)
{
	const bot   = info.bot;
	const event = info.event;
	const gid   = event.group_id;

	const man  = bot.getShared('hush-battle').Manager;
	const uid  = isNaN(viewData.uid) ? event.user_id : viewData.uid;
	const more = viewData.more;

	let server = man.openServer(gid);
	let role   = server.getRoleInfo(uid);

	let text;
	if (!role)
	{
		text = '[系统消息] 未找到该玩家'
	} else
	{
		text = `编号：${role.uid}\n` +
			`昵称：${role.nickname}\n` +
			`等级：${role.level}（${role.info.experience}/${100}）\n` +
			`血量：${Math.ceil(role.HP)}/${role.maxHP}\n` +
			`能量：${Math.ceil(role.MP)}/${role.maxMP}`;
		if (more)
		{
			text += `\n力量：${role.attribute.strength}`
				+ `\n敏捷：${role.attribute.agile}`
				+ `\n智慧：${role.attribute.wisdom}`
				+ `\n每秒回血：${Math.floor(role.attribute.hp_recovery * 100) / 100}`
				+ `\n每秒回蓝：${Math.floor(role.attribute.mp_recovery * 100) / 100}`;
		}
	}

	bot.sendGroupMsg(gid, text);
}

function setup(bot, field)
{
	field.Manager = new HBManager;
}

function listener_0(info)
{
	const bot   = info.bot;
	const event = info.event;
	const gid   = event.group_id;
	const uid   = event.user_id;

	if (event.raw_message[0] != '.') return;
	const raw_cmd = event.raw_message.slice(1);

	parser.execute(raw_cmd, cmdDesc, async (subcmd, argeles, freewords) => {
		switch (subcmd.keyword)
		{
			case 'help':
				bot.sendGroupMsg(gid, doc.HELP_ALL);
			break;
			case 'init':
				if (argeles.help)
				{
					bot.sendGroupMsg(gid, doc.HELP_INIT);
					break;
				}
				performInit(info, argeles?.force ? true : false);
			break;
			case 'list':
				if (argeles.help)
				{
					bot.sendGroupMsg(gid, doc.HELP_LIST);
					break;
				}
				performList(info, { target: subcmd.args._ ? subcmd.args._[0] : 'server' });
			break;
			case 'view':
				if (argeles.help)
				{
					bot.sendGroupMsg(gid, doc.HELP_VIEW);
					break;
				}
				performView(info, {
					uid: subcmd.args._ ? Number(subcmd.args._[0]) : uid,
					more: argeles.more ? true : false
				});
			break;
			case 'login':
				performLogin(info, { server: gid, uid: uid });
			break;
			case 'logout':
				performLogout(info, { server: gid, uid: uid });
			break;
			case 'join':
			break;
			case 'PVE':
				if (argeles.help)
				{
					bot.sendGroupMsg(gid, doc.HELP_PVE);
					break;
				}
				console.log('[INFO] plugin.hush-battle: launch hush-battle PVE');
			break;
			case 'PVP':
				if (argeles.help)
				{
					bot.sendGroupMsg(gid, doc.HELP_PVP);
					break;
				}
				console.log('[INFO] plugin.hush-battle: launch hush-battle PVP');
			default:
				if (argeles.help)
				{
					bot.sendGroupMsg(gid, doc.HELP_ALL);
					break;
				}
			break;
		}
	}).catch((e) => {
		bot.sendGroupMsg(gid, '[系统消息] 命令已否决');
		console.error('[ERROR]', e.message);
	})
}

const description =
{
	plugin: 'hush-battle',
	setup: setup, //! 插件初始化过程，参数形式 function (bot, field) { ... }
	actions: [{
		event: 'message.group.normal',
		subname: 'server',
		action: listener_0
	}]
};

module.exports =
{
	description
};