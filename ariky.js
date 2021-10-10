const { MelaiiBot } = require('./lib/bot');

var plugins = [ 'default', 'p24', 'music', 'jrrp' ];

bot = new MelaiiBot(1745096608, { ignore_self: false });
bot.login('sec9623r78r');

for (var i in plugins)
{
	bot.registerPlugin(
		require('./plugins/' + plugins[i] + '/' + plugins[i] + '_listener')
		.description);
}