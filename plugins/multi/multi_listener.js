"use strict";

const { clone } = require('lodash');
const parser = require('../../lib/parser');

async function listener_0(event)
{
	const uid = event.user_id;
	const gid = event.group_id;

	if (event.raw_message[0] != '.') return true;
	const raw_cmd = event.raw_message.slice(1);

	return await parser.execute(raw_cmd, parser.getdesctemp('multi'),
	(subcmd, argeles, freewords) => {
		let this_event = `message.${event.message_type}.${event.sub_type}`;
		freewords.forEach((e) => {
			let eventData = clone(event);
			eventData.raw_message = e.word;
			this.emit(this_event, eventData);
		});
		return false;
	}).catch((e) => {
		this.error(`plugin.multi: ${e.message}`);
		return true;
	}) ?? true;
}

const description =
{
	plugin: 'multi',
	actions: [{
		event: 'message',
		subname: 'multi-caller',
		action: listener_0
	}]
};

module.exports =
{
	description
};