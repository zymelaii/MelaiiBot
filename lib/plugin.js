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
//! @note: status_code: {
//! 	 0: done
//! 	 1: plugin was already installed
//! 	-1: illegal instance of MelaiiBot
//! 	-2: no plugin name given
//! 	-3: cannot find the plugin module in the searching path,
//! 		which is usually "${ROOT}/plugins"
//! 	-4: failed when installing the plugin,
//! 		perhaps it's broken
/// }
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
				errmsg: 'plugin was already registered'
			};
		}
		bot.unregisterPlugin(plugin);
		decache(plugin_path);
	}

	try {
		let description = require(plugin_path).description;
		bot.registerPlugin(description);
	} catch(e) {
		return {
			status_code: -4,
			errmsg: `plugin might be broken`,
			exception: e
		};
	}

	return { status_code: 0 };
}

/// unregister(bot, plugin)
//! @param: bot: MelaiiBot
//! @param: plugin: String
//! @return: { status_code: Integer, errmsg: String }
//! @note: status_code: {
//! 	 0: done
//! 	 1: plugin hasn't installed
//! 	-1: illegal instance of MelaiiBot
//! 	-2: no plugin name given
//! 	-3: unregister has no permission to remove the plugin,
//! 		perhaps it is a built-in one
/// }
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
		if (removed > 0) return { status_code: 0 };
		if (removed == -1) return {
			status_code: -3,
			errmsg: 'permission denied'
		};
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