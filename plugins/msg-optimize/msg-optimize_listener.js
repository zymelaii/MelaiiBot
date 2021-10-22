"use strict";

const path = require('path');
const { loadFileAsJson } = require('../../lib/filesys');
const parser = require('../../lib/parser');

const cmdDesc = parser.fixdesc(
	loadFileAsJson(path.resolve(__dirname, './msgopt.json'))
);

//! 消息去重插件

function setup(field)
{
	field.msg_records = { 'private': {}, 'group': {}, 'discuss': {} };
	field.cut_total = 0;
	field.this_env = this.env;
	field.show_details = false;
	field.trace_cut = setInterval(() => {
		this.info('plugin.msg-optimize:',
			`${field.this_env} 环境下已截断消息 ${field.cut_total} 条`);
	}, 60 * 1000/*每分钟反馈一次*/);

	this.addListener('message', '#msg-optimize.strip', function (event) {
		let records = field.msg_records[event.message_type];
		let uid = event.user_id;
		let id = ({
			'private': event.user_id,
			'group': event.group_id,
			'discuss': event.discuss_id
		})[event.message_type];

		if (!records[id])
		{
			records[id] = [uid, event.time, event.message_id];
			return;
		}

		if (records[id][2] == event.message_id
			|| records[id][0] == uid && records[id][1] == event.time)
		{
			if (field.show_details)
			{
				this.trace(
					`${field.this_env} 环境下截断消息 ${event.message_id}；`,
					`发送者：${event.user_id}；`,
					`消息内容：${event.raw_message}`);
			}
			++field.cut_total;
			return false;
		} else
		{
			records[id] = [uid, event.time, event.message_id];
		}
	}, 0); //! 设置为高优先级
}

function uninstall()
{
	this.mark('消息去重器已卸载，可能面临消息重复的风险');
	clearInterval(this.getShared('msg-optimize').trace_cut);
	this.delListener('message', '#msg-optimize.strip');
}

async function listener_0(event)
{
	if (event.raw_message[0] != '.') return true;
	const raw_cmd = event.raw_message.slice(1);

	return await parser.execute(raw_cmd, cmdDesc, (subcmd, argeles, freewords) => {
		let field = this.getShared('msg-optimize');
		if (argeles['show-cutdetails'])
		{
			field.show_details = true;
		} else if (argeles['no-cutdetails'])
		{
			field.show_details = false;
		}
		return false;
	}).catch((e) => {
		this.error('plugin.msg-optimize:', e.message);
		return false;
	}) ?? true;
}

const description =
{
	plugin: 'msg-optimize',
	setup: setup,
	uninstall: uninstall,
	actions: [{
		event: 'message',
		subname: 'msgopt-man',
		action: listener_0
	}]
};

module.exports =
{
	description
};