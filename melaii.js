const { MelaiiBot } = require('./lib/bot');

var plugins = [ 'default', 'p24', 'music', 'jrrp' ];

var plugin_default = require('./plugins/default/default_listener');
var plugin_p24 = require('./plugins/p24/p24_listener');

bot = new MelaiiBot(2974913240, { ignore_self: false, log_level: 'warn' });
bot.login('nes07532196svl');

for (var i in plugins)
{
	bot.registerPlugin(
		require('./plugins/' + plugins[i] + '/' + plugins[i] + '_listener')
		.description);
}