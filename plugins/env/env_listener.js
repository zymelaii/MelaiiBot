"use strict";

const path = require('path');
const { loadFileAsJson } = require('../../lib/filesys');
const parser = require('../../lib/parser');
const plugin = require('../../lib/plugin');

const cmdDesc = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, 'env.json'))
);

function setup(field)
{
	field.admin = 1745096608;
}

function performNew(event, newData)
{
	const gid = event?.group_id;
	const uid = event?.user_id;
	let   env = newData.env;

	if (!env) return;

	if (this.envs.includes(env))
	{
		this.sendMsg('环境已存在！', { gid: gid, uid:uid });
	} else
	{
		let old_env = this.env;
		this.switchTo(env, true);
		if (this.envs.includes(env))
		{
			this.sendMsg(`环境【${env}】创建成功！`, { gid: gid, uid:uid });
		} else
		{
			this.sendMsg(`环境创建失败！`, { gid: gid, uid:uid });
		}
	}
}

function performSet(event, setData)
{
	const gid = event?.group_id;
	const uid = event?.user_id;
	let   env = setData.env;

	if (!env)
	{
		this.sendMsg(`${event.sender.nickname}，需要换到什么环境呢？`,
			{ gid: gid, uid:uid });
		return;
	}

	if (env == this.env)
	{
		this.sendMsg(`现在已经是【${env}】环境啦~`, { gid: gid, uid:uid });
		return;
	}

	if (!this.envs.includes(env))
	{
		this.sendMsg(`环境【${env}】不存在！`, { gid: gid, uid:uid });
	} else
	{
		this.switchTo(env);
		this.sendMsg(`成功切换到【${env}】环境啦！`, { gid: gid, uid:uid });
	}
}

function listener_0(event)
{
	const gid = event?.group_id;
	const uid = event?.user_id;

	if (event.raw_message[0] != '.') return;
	let raw_cmd = event.raw_message.slice(1);

	parser.execute(raw_cmd, cmdDesc, async (subcmd, argeles, freewords) => {
		if (uid != this.getShared('env').admin) return;

		switch (subcmd.keyword)
		{
			case 'new':
				performNew.call(this, event, { env: subcmd.args ? subcmd.args._[0] : null });
			break;
			case 'set':
				performSet.call(this, event, { env: subcmd.args ? subcmd.args._[0] : null });
			break;
			case 'list':
				this.sendMsg(`环境列表：\n${this.envs.join('\n')}`, { gid: gid, uid: uid });
			break;
			default:
				this.sendMsg(`当前环境：${this.env}`, { gid: gid, uid:uid });
			break;
		}
	}).catch((e) => {
		this.error('plugin.env:', e.message);
	});
}

const description =
{
	plugin: 'env',
	setup: setup,
	actions: [{
		event: 'message',
		subname: 'env-ctrl',
		action: listener_0
	}]
};

module.exports =
{
	description
};