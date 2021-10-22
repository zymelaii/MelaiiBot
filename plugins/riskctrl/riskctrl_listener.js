"use strict";

function unsetRiskCtrl(data)
{
	if (data.depth > 0) --data.depth;
	if (data.depth == 0)
	{
		data.on_riskctrl = false;
		this.info('plugin.riskctrl:',
			'cleared risk control flag');
	} else if (data.depth < 0)
	{
		this.warn('plugin.riskctrl:',
			`unexpected riskctrl flag [${data.depth}] (reset to 0)`);
		data.depth = 0;
	}
}

function setRiskCtrl(status, data)
{
	if (data.depth == 0)
	{	//! 启用风控消息限制
		data.on_riskctrl = true;
		this._max_groupmsg_len = field.rc_msglimit;
		this._cut_style = field.rc_cutstyle;
	}

	++data.depth;

	setTimeout(() => {
		unsetRiskCtrl.call(this, data);
	}, 10 * 60 * 1000); //! 启用10分钟的风控限制

	this.info('plugin.riskctrl:',
		`set risk control flag [${data.depth}]`);
}

function setup(field)
{
	field.on_riskctrl = false;
	field.depth = 0;

	field.rc_msglimit = 64; //! 风控状态消息最大长度
	field.rc_cutstyle = 1;  //! 风控状态消息单行截断

	field.origin_msglimit = this._max_groupmsg_len;
	field.origin_cutstyle = this._cut_style;

	field.monitor = setInterval(() => {
		if (field.on_riskctrl)
		{
			if (this._max_groupmsg_len != field.rc_msglimit)
			{
				this._max_groupmsg_len = field.rc_msglimit;
			}
			if (this._cut_style != field.rc_cutstyle)
			{
				this._cut_style = field.rc_cutstyle;
			}
		}
	}, 4000); //! 监察者，防止风控状态被意外篡改

	this.addListener('system.riskctrl', 'barriar', function (event) {
		if (event.status)
		{
			setRiskCtrl.call(this, field);
		} else
		{
			unsetRiskCtrl.call(this, field);
		}
		return true;
	});
}

function uninstall()
{
	let field = this.getShared('riskctrl');

	this._max_groupmsg_len = field.origin_msglimit;
	this._cut_style = field.origin_cutstyle; //! 强制复原

	clearInterval(field.monitor);
	this.delListener('system.riskctrl', 'barriar');
}

const description =
{
	plugin: 'riskctrl',
	setup,
	uninstall,
	actions: [
		event: 'system.riskctrl',
		subname: 'dummy',
		action: () => true
	]
};

module.exports =
{
	description
};