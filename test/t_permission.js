const { Permission } = require('../lib/permission');
const utils = require('../lib/utils');

pr = new Permission(10000, 7), i = 0;

function clog(e) {
	console.log(`[${`${++i}`.padStart(4, '0')}] ${`${e}:`.padEnd(48)}`, eval(e));
}

clog("pr.root");
clog("pr.sa");
clog("pr.global");
clog("pr.local");
clog("pr.temporary");

clog("pr.createLocalScope('global')");
clog("pr.local");
clog("pr.createLocalScope('temporary')");
clog("pr.local");
clog("pr.createLocalScope('29791')");
clog("pr.local");
clog("pr.createLocalScope('88481')");
clog("pr.createLocalScope('5201314')");
clog("pr.local");
clog("pr.createLocalScope('88481')");
clog("pr.local");
clog("pr.removeLocalScope('88481')");
clog("pr.local");

clog("pr.addGuest('toura21')");
clog("pr.addGuest('shitfuck')");
clog("pr.addGuest('code-007')");
clog("pr.addGuest('tmp-301')");
clog("pr.temporary");
clog("pr.delGuest('shitfuck')")
clog("pr.delGuest('loli~')");
clog("pr.temporary");

clog("pr.getCPL('10000')");
clog("pr.getCPL('7')");
clog("pr.getCPL('code-007')");
clog("pr.getCPL('cc')");
clog("pr.getCPL('toura21')");

clog("pr.addUser('cc', 'global')");
clog("pr.addUser('toura21', 'global')");
clog("pr.addUser('code-007', '5201314')");
clog("pr.addUser('cp', 'temporary')");
clog("pr.addUser('cc', 'global')");
clog("pr.addUser('code-006', '5201314')");
clog("pr.addUser('code-007', 'global')");
clog("pr.addUser('code-007', '5201314')");
clog("pr.global");
clog("pr.local");
clog("pr.temporary");

clog("pr.addUser('code-001', '5201314')");
clog("pr.addUser('code-002', '5201314')");
clog("pr.addUser('code-003', '5201314')");
clog("pr.addUser('code-004', '5201314')");
clog("pr.addUser('code-005', '5201314')");

clog("pr.addUser('msb-001', '29791')");
clog("pr.addUser('msb-002', '29791')");
clog("pr.addUser('msb-003', '29791')");
clog("pr.addUser('msb-004', '29791')");
clog("pr.addUser('msb-005', '29791')");

clog("(t = pr.liftCPL('code-006', '5201314', '5201314', pr.sa, 'global'), Permission.code2msg(t))");
clog("(t = pr.liftCPL('code-007', '5201314', '5201314', pr.sa, 'global'), Permission.code2msg(t))");
clog("(t = pr.liftCPL('code-007', '5201314', '5201314', 'code-007', '5201314'), Permission.code2msg(t))");
clog("(t = pr.liftCPL('tmp-301', 'temporary', '5201314', 'code-007', '5201314'), Permission.code2msg(t))");
clog("(t = pr.liftCPL('tmp-301', 'temporary', '5201314', 'code-006', '5201314'), Permission.code2msg(t))");
clog("pr.local");
clog("pr.temporary");