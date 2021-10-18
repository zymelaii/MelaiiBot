"use strict";

const path = require('path');
const fs = require('fs');
const decache = require('decache');

function plugin2path(plugin)
{
	return path.resolve(
		__dirname, `../plugins/${plugin}/${plugin}_listener.js`);
}

function transfer(plugin, callback)
{
	const plugin_path = plugin2path(plugin);

	if (!fs.existsSync(plugin_path)) return;

	callback(require(plugin_path).description);
}

/// register(bot, plugin, overwrite)
//! @param: bot: MelaiiBot
//! @param: plugin: String
//! @param: overwrite: Boolean
/// @return: { status_code: Integer, errmsg: String }
function register(bot, plugin, overwrite = false)
{
	if (!bot)
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

	const plugin_path = plugin2path(plugin);

	if (!fs.existsSync(plugin_path))
	{
		return {
			status_code: -3,
			errmsg: 'cannot find plugin in searching dirs'
		};
	}

	if (bot.plugins.includes(plugin))
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

/// unregister(bot, plugin)
//! @param: bot: MelaiiBot
//! @param: plugin: String
/// @return: { status_code: Integer, errmsg: String }
function unregister(bot, plugin)
{
	if (!bot)
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

	bot.plugins.includes(plugin)
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
	plugin2path,
	transfer,
	register,
	unregister
};