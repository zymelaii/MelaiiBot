"use strict";

const parser = require('../../lib/parser');
const { randomPickLocal, randomPickKonachan } = require('./nolp');
const { cqcode } = require('oicq');

async function listener_0(event)
{
	const gid = event.group_id;

	if (event.raw_message[0] != '.') return true;
	const raw_cmd = event.raw_message.slice(1);

	return await parser.execute(raw_cmd, parser.getdesctemp('nolp'),
	() => {
		this.sendGroupMsg(gid, cqcode.image(randomPickLocal()));
		return false;
	}).catch((e) => {
		this.error(`plugin.nolp: ${e.message}`);
		return false;
	}) ?? true;
}

const description =
{
	plugin: 'nolp',
	actions: [{
		event: 'message.group.normal',
		subname: 'nolp-pick',
		action: listener_0
	}]
};

module.exports =
{
	description
};