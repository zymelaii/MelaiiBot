"use strict";

const { MelaiiBot } = require('../../lib/bot');
const path = require('path');
const fs = require('fs');
const decache = require('decache');

function register(bot, plugin, overwrite = false)
{
	if (bot.constructor.toString() != MelaiiBot.toString())
	{
		return {
			status_code: -1,
			errmsg: 'request MelaiiBot instance'
		};
	}

	if (!plugin)
	{
		return {
			status_code: -2,
			errmsg: 'request plugin name'
		};
	}

	const plugin_path = path.resolve(
		__dirname, `../${plugin}/${plugin}_listener.js`);

	if (!fs.existsSync(plugin_path))
	{
		return {
			status_code: -3,
			errmsg: 'cannot find plugin in searching dirs'
		};
	}

	if (bot.plugins.indexOf(plugin) != -1)
	{
		if (!overwrite)
		{
			return {
				status_code: 1,
				errmsg: 'plugin is already registered'
			};
		}
		bot.unregisterPlugin(plugin);
		decache(plugin_path);
	}

	try {
		let description = require(plugin_path).description;
		bot.registerPlugin(description);
		console.log(
			`[MARK] 插件 ${'\x1b[31;40m'}${plugin}${'\x1b[0m'} 已加载`);
	} catch(e) {
		console.warn(
			`[WARN] 插件 ${'\x1b[31;40m'}${plugin}${'\x1b[0m'} 加载失败 (${e.message})`);
		return {
			status_code: -4,
			errmsg: 'plugin might be broken'
		};
	}

	return { status_code: 0 };
}

function unregister(bot, plugin)
{
	if (bot.constructor.toString() != MelaiiBot.toString())
	{
		return {
			status_code: -1,
			errmsg: 'request MelaiiBot instance'
		};
	}

	if (!plugin)
	{
		return {
			status_code: -2,
			errmsg: 'request plugin name'
		};
	}

	if (bot.plugins.indexOf(plugin) != -1)
	{
		let removed = bot.unregisterPlugin(plugin);
		if (removed != 0)
		{
			console.log(`[MARK] 插件 ${'\x1b[31;40m'}${plugin}${'\x1b[0m'} 已卸载`);
			return { status_code: 0 };
		}
	}

	return {
		status_code: 1,
		errmsg: 'plugin isn\'t registered yet'
	};
}

module.exports =
{
	register,
	unregister
};