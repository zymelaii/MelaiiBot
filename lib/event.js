"use strict";

const { clone } = require('lodash');

class EventManager
{
	/// {
	//!   domain: {
	//!     listeners: [
	//! 	  {
	//! 		name: String,
	//! 		action: Function,
	//! 		priority: Number,
	//! 	  }...
	//! 	],
	//! 	domains: { ... }
	//!   },
	//!   domain...
	/// }
	_events;

	constructor(ee = null)
	{
		this._events = {};
	}

	/// @intro: 获取所有有效事件名
	getEventNames(prefix = '', domains = this._events)
	{
		let names = [];

		if (Object.keys(domains) == 0) return names;

		for (let domain in domains)
		{
			let event = `${prefix}.${domain}`;
			if (domains[domain].listeners.length != 0)
			{
				names.push(event);
			}
			names = names.concat(this.getEventNames(
				event, domains[domain].domains));
		}

		return names;
	}

	/// @intro: 包装形式调用函数
	async _call_wrapper(action, data, context = null)
	{
		try {
			return { status: true, data: await action.call(context, data) };
		} catch(e) {
			return { status: false, err: e };
		}
	}

	/// @intro: 按配置调用函数列表
	async _call_multi(actions, data, extra)
	{
		const sync    = extra?.sync ?? true;
		const nobreak = extra?.nobreak ?? false;
		const context = extra?.context;

		let result = {
			done: 0,     //! 执行成功数
			break: false //! 是否中断或应当中断
		};

		if (sync)
		{
			for (let i in actions)
			{	//! 顺序执行
				let resp = await this._call_wrapper(actions[i], data, context);
				if (!resp.status)
				{
					this.emit('error', {
						scope: 'EventManager._call_multi',
						message: resp.err
					}, {
						upward: false,
						sync: false,
						nobreak: true,
						context: context ?? this
					}); //! 内置事件，发送错误报告
				}

				result.done += resp.status ? 1 : 0;

				//! resp.data 指代是否应该继续
				if (!resp.data && !nobreak)
				{
					result.break = true;
					break;
				}
			}
		} else
		{
			let results = await Promise.all(actions.map(
			async (action) => {
				let resp = await this._call_wrapper(action, data, context);
				return { done: resp.status, break: !resp.data };
			})); //! 并行执行，不中断
			result.done  = results.filter((e) => e.done).length;
			result.break = !nobreak && results.map((e) => e.break).includes(true);
		}

		return result;
	}

	/// @intro: 获取事件的父域节点
	_find_event_parent_domain(event)
	{
		let domains = event.split('.'), i = 0;
		let target = domains.splice(domains.length - 1, 1);
		let domain = this._events;

		while (domain != null)
		{
			if (domain[target] != null && i == domains.length)
			{
				return domain;
			}
			if (i >= domains.length) return null;
			domain = domain[domains[i++]]?.domains;
		}

		return null;
	}

	/// @intro: 获取事件的域节点
	_find_event_domain(event)
	{
		let domains = event.split('.'), i = 0;
		let domain = this._events;
		while (true)
		{
			domain = domain[domains[i++]];
			if (domain == null || i == domains.length) return domain;
			domain = domain.domains;
		}
		return null;
	}

	/// @intro: 触发事件
	async emit(event, data, extra)
	{
		let now = Date.now();

		const upward  = extra?.upward ?? true;   //! 是否逐级调用
		const sync    = extra?.sync ?? true;     //! 是否线性同步调用
		const nobreak = extra?.nobreak ?? false; //! 动作执行失败是否继续后续调用
		const _extra  = { upward, sync, nobreak, context: extra?.context };

		let trigger = 0; //! 有效触发事件总数
		let action  = 0; //! 成功执行动作总数

		let domains = event.split('.'), i = 0;
		let handler = this._events[domains[i++]];
		if (!upward)
		{
			while (handler != null && i < domains.length)
			{
				handler = handler.domains[domains[i++]];
			}
		}

		let result = null;
		while (handler != null && i <= domains.length)
		{	//! 逐级处理事件
			result = await this._call_multi(
				handler.listeners.map((e) => e.action), data, _extra);

			action  += result.done;
			trigger += result.done > 0 ? 1 : 0;

			if (result.break)
			{	//! 处理中断请求
				break;
			}

			handler = handler.domains[domains[i++]];
		}

		let emit_result = { trigger, action, break: result?.break ?? false };

		if (event != 'done' || event == 'done'
			&& typeof(data?.scope) == 'string'
			&& data?.scope != 'EventManager.emit')
		{
			this.emit('done', {
				scope: 'EventManager.emit',
				event,
				result: clone(emit_result),
				cost: Date.now() - now
			}, {
				upward: false,
				sync: false,
				nobreak: true,
				context: this
			}); //! 内置事件，发送处理完成信号
		}

		return emit_result;
	}

	/// @intro: 创建新事件节点
	newEvent(event)
	{
		let parent_domain = this._find_event_parent_domain(event);
		let domains = event.split('.');
		let target = domains.splice(-1)[0];

		if (parent_domain == null)
		{
			parent_domain = this._events;
			domains.forEach((domain) => {
				if (parent_domain[domain] == null)
				{
					parent_domain[domain] = { listeners: [], domains: {} };
				}
				parent_domain = parent_domain[domain].domains;
			});
			parent_domain[target] = { listeners: [], domains: {} };
		}

		return parent_domain;
	}

	/// @intro: 移除事件
	removeEvent(event, recursively = true)
	{
		let domains = this._find_event_parent_domain(event);
		if (domains == null) return false;

		let target = event.split('.').slice(-1)[0];
		if (recursively)
		{
			delete domains[target];
			return true;
		}

		let domain = domains[target];
		if (Object.keys(domain.domains) == 0)
		{
			delete domains[target];
		} else
		{
			domain.listeners = [];
		}

		return true;
	}

	/// @intro: 为事件添加添加监听单元
	addListener(event, name, action, priority = 3)
	{
		let domain = this.newEvent(event)[event.split('.').slice(-1)[0]];
		let listeners = domain.listeners;
		let index = listeners.findIndex((e) => e.name == name);
		if (index != -1) return false;
		listeners.push({ name, action, priority });
		domain.listeners = listeners.sort((a, b) => a.priority - b.priority);
		return true;
	}

	/// @intro: 移除事件的监听单元
	delListener(event, name = null)
	{
		if (name == null) return this.removeEvent(event, false);
		
		let domain = this._find_event_domain(event);
		if (domain == null) return false;

		let listeners = domain.listeners;
		let index = listeners.findIndex((e) => e.name == name);
		if (index == -1) return false;

		listeners.splice(index, 1);

		return true;
	}
};

module.exports =
{
	EventManager
};