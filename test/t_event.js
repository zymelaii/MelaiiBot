const { EventManager } = require('../lib/event');
const utils = require('../lib/utils');

em = new EventManager;

em.addListener('base.echo.me', '@me-1', (e) => {
	console.log('echo me:', e);
});

em.addListener('base.echo.me', '@me-2', (e) => {
	console.log('echo me: leader!');
}, 0);

em.addListener('base.echo.me', '@me-3', (e) => {
	console.log('echo me: faker!');
}, 1);

em.addListener('base.echo.other', '@other', (e) => {
	console.log('echo other:', e);
});

em.addListener('base.echo.shit', '@shit', (e) => {
	console.log('echo shit:', e);
});

em.addListener('base.echo', '@barriar', (e) => {
	this.shouldEcho = !this.shouldEcho;
	console.log(`Starting echo: enable=${this.shouldEcho}`);
	return this.shouldEcho;
});

em.addListener('base.reply', '@unknown', (e) => true);
em.addListener('shit', '@unknown', (e) => true);
em.addListener('shit.next', '@unknown', (e) => true);
em.addListener('dummy', '@unknown', (e) => true);

em.removeEvent('shit');
em.removeEvent('base.echo.me', false);

(async () => {
	console.log(await utils.coloredStringify(em));
	await em.emit('base.echo.me', 'Hello World!');
	await em.emit('base.echo.other', 'Hello World!', { nobreak: true });
})();
