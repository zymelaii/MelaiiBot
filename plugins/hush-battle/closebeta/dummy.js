"use strict";

const path = require('path');
const { loadFileAsJson } = require('../../../lib/filesys');
const { cloneDeep } = require('lodash');
const { HBManager } = require('../manager');
const { HBServer }  = require('../server');
const { HBRole }    = require('../role');

class EntityConfig
{
	constructor(configData)
	{
		const fnconfig = configData?.description;
		const roleattr = configData?.attribute;

		if (!fnconfig && !roleattr) throw new Error('');

		this.attribute = fnconfig
			? loadFileAsJson(fnconfig)
			: {
				card: roleattr.nickname,
				level: roleattr.level,
				attribute: cloneDeep(roleattr.attribute.stable)
			};

		this.hatrelist = [/*[id, hatrepoint]*/];

		this.fnattack  = null; //! (AttackData) -> Boolean
		this.fninjured = null; //! (InjuredData) -> Boolean
	}

	set OnAttack(fnattack)
	{
		if (typeof(fnattack) == 'function')
		{
			this.fnattack = fnattack;
			console.log('[INFO] plugin.hush-battle.dummy: set OnAttack function');
		}
	}

	set OnInjured(fninjured)
	{
		if (typeof(fninjured) == 'function')
		{
			this.fninjured = fninjured;
			console.log('[INFO] plugin.hush-battle.dummy: set OnInjured function');
		}
	}
}

class Entity
{
	constructor(world, objref, data)
	{
		this.id     = new Date().getTime();
		this.obj    = objref;
		this.world  = world;
		this.config = new EntityConfig({
			attribute: objref?.attribute,
			description: data?.description
		});
	}
}

module.exports =
{
	Entity
};