"use strict";

const { cloneDeep } = require('lodash');
const { random, randomInt } = require('../../lib/utils');

///
//! @desc: 生成初始玩家信息
///
function newDefaultRole(registerData)
{
	let uid = registerData?.uid;
	let nickname = registerData?.nickname;

	if (!uid) uid = new Date().getTime();
	if (!nickname) nickname = '新用户';

	/// 角色档案
	//! uid: 角色编号
	//! nickname: 角色昵称
	//! level: 角色等级
	//! experience: 经验值
	//! last_active: 最后活跃时间
	//! attribute: { 角色属性
	//!     stable: { 静态属性
	//!         health: 初始生命值
	//!         power: 初始能量值
	//!         strength: 力量
	//!         agile: 敏捷
	//!         wisdom: 智慧
	//!         hp_recovery: 每秒回血量
	//!         mp_recovery: 每秒回蓝量
	//!     }
	//!     dynamic: { 动态属性
	//!         HP: 生命值
	//!         MP: 能量值
	//!     },
	/// }

	let roleinfo               = {};

	roleinfo.uid               = uid;
	roleinfo.nickname          = nickname;
	roleinfo.level             = 1;
	roleinfo.experience        = randomInt(0, 64);
	roleinfo.last_active       = null; //! 未登录状态

	roleinfo.attribute         = {};
	roleinfo.attribute.stable  = {};
	roleinfo.attribute.dynamic = {};

	roleinfo.attribute.stable.health      = randomInt(80, 120);
	roleinfo.attribute.stable.power       = randomInt(0, 16);
	roleinfo.attribute.stable.strength    = randomInt(2, 8);
	roleinfo.attribute.stable.agile       = randomInt(36, 50);
	roleinfo.attribute.stable.wisdom      = randomInt(90, 160);
	roleinfo.attribute.stable.hp_recovery = random(0.2, 1.6);
	roleinfo.attribute.stable.mp_recovery = random(0.01, 1.0);

	roleinfo.attribute.dynamic.HP = roleinfo.attribute.stable.health;
	roleinfo.attribute.dynamic.MP = roleinfo.attribute.stable.power;

	return roleinfo;
}

///
//! @desc: 玩家最近一周是否活跃
///
function isActiveRecently(roleinfo)
{
	if (!roleinfo.last_active) return false;

	return (new Date().getTime() - roleinfo.last_active)
		/ (24/*h->day*/ * 3600/*s->h*/ * 1000/*ms->s*/) <= 7;
}

class HBRole {
	///
	//! @param: roleinfo: 角色档案（必须完整提供）
	///
	constructor(roleinfo)
	{
		this._roleinfo = roleinfo && roleinfo.uid ? cloneDeep(roleinfo) : null;
		this._online = false;
		this._laststatustick = new Date().getTime();
	}

	get info()
	{
		if (!this.isValid()) return null;
		return this._roleinfo;
	}

	get attribute()
	{
		if (!this.isValid()) return null;
		return this.info.attribute.stable;
	}

	get uid()
	{
		if (!this.isValid()) return null;
		return this.info.uid;
	}

	get nickname()
	{
		if (!this.isValid()) return null;
		return this.info.nickname;
	}

	get level()
	{
		if (!this.isValid()) return null;
		return this.info.level;
	}

	get maxHP()
	{
		if (!this.isValid()) return null;
		return this.info.attribute.stable.health;
	}

	get maxMP()
	{
		if (!this.isValid()) return null;
		return this.info.attribute.stable.power;
	}

	get HP()
	{
		if (!this.isValid()) return null;
		this.updateStatus();
		return this.info.attribute.dynamic.HP;
	}

	get MP()
	{
		if (!this.isValid()) return null;
		this.updateStatus();
		return this.info.attribute.dynamic.MP;
	}

	isValid()
	{
		return !!this._roleinfo;
	}

	isOnline()
	{
		if (!this.isValid()) return false;
		return this._online;
	}

	isActiveRecently()
	{
		if (!this.isValid()) return false;
		return isActiveRecently(this._roleinfo);
	}

	updateStatus()
	{
		if (!this.isValid()) return;

		let currenttick = new Date().getTime();
		let duration = currenttick - this._laststatustick;

		this.info.attribute.dynamic.HP = Math.min(
			this.info.attribute.dynamic.HP
			+ this.info.attribute.stable.hp_recovery * duration / 1000,
			this.maxHP);

		this.info.attribute.dynamic.MP = Math.min(
			this.info.attribute.dynamic.MP
			+ this.info.attribute.stable.mp_recovery * duration / 1000,
			this.maxMP);

		this._laststatustick = currenttick;
	}

	refreshOnlineStatus()
	{
		if (!this.isValid()) return;
		this.info.last_active = new Date().getTime();
	}

	login()
	{
		if (!this.isValid()) return;
		if (!this._online)
		{
			this._online = true;
			this.refreshOnlineStatus();
		}
	}

	logout()
	{
		if (!this.isValid()) return;
		if (this._online)
		{
			this._online = false;
			this.refreshOnlineStatus();
		}
	}
}

module.exports =
{
	newDefaultRole,
	isActiveRecently,
	HBRole
}