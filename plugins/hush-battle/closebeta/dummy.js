"use strict";

const path = require('path');
const { loadFileAsJson } = require('../../../lib/filesys');
const { cloneDeep } = require('lodash');
const { HBManager } = require('../manager');
const { HBServer }  = require('../server');
const { HBRole }    = require('../role');

/// 视野属性构造
//! @param: type: "all" | "range" 全局视野/范围视野
//! @param: radius: Number 圆形范围视野半径
class VisionField
{
	constructor(type, radius = 0)
	{
		this.type = type;
		this.radius = radius;
	}
}

class SceneMap
{
	constructor()
	{
		this.nodes = new Map();
	}
	get(id) {
		return this.nodes.get(id);
	}
	add(id, obj, pos) {
		this.nodes.set(id, { ref: obj, pos: { x: pos.x, y: pos.y } });
		return this;
	}
	del(id) {
		this.nodes.delete(id);
		return this;
	}
	move(id, vec, absolute = true) {
		let node = this.get(id);
		if (absolute) { //! 绝对坐标
			node.pos = { x: vec.x, y: vec.y };
		} else {        //! 相对坐标
			node.pos.x += vec.x;
			node.pox.y += vec.y;
		}
		return this;
	}
	nodesInVision(id, vision) {
		let source = this.get(id);
		let center = source.pos;
		let visable_nodes = new Array();
		for (let tid in this.nodes.keys())
		{	//! 获取视野范围内的节点
			if (source === this.get(tid)) continue;
			if (vision.type == 'all') {
				visable_nodes.push(tid);
			} else {
				let pt = this.get(tid).pos;
				let sqdist = (pt.x - center.x) ** 2 + (pt.y - center.y) ** 2;
				if (sqdist <= vision.radius ** 2) {
					visable_nodes.push(tid);
				}
			}
		}
	}
}

class Behavior
{
	constructor(scene, obj, action)
	{

	}
}

/// Dummy Mob (内测怪物模板)
//! card 名称
//! level 等级
//! attribute: { 固有属性
//! 	health 最大生命值
//! 	power 最大能量
//! 	strength 力量
//! 	agile 敏捷
//! 	wisdom 智慧
//! 	hp_recovery 每秒回血
//! 	mp_recovery 每秒回蓝
//! }
var DummyMob = loadFileAsJson('./mob.json');

module.exports =
{
	Entity
};