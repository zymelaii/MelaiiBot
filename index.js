const { segment, createClient } = require('oicq');

const account = 2974913240;
const admin = 1745096608;
const client = createClient(account, {ignore_self: false});

//插件
const { calc24, gen24 } = require('./plugins/p24'); //24点计算
var p24_group = null; //作答的群，为null表示未开始
var p24_remain = 3;   //剩余作答次数，作答次数3次
var p24_target = 24;  //目标值
var p24_nums = [];    //运算的数字


var lastMessage = ''; //记录上一条发送的消息，防止重复发送
var active = true; //活跃状态

var env = 'normal'; //环境设置
//normal 常规
//javascript js环境

var onlineMethods = {}; //支持保存javascript环境中创建的函数

newMethod = (name, e) =>
{
	onlineMethods[name] = e;
}

isEnvSupport = (e) =>
{
	return [
		'normal',
		'javascript'
	].indexOf(e) != -1;
}

isGroupSupport = (e) =>
{
	return [
		783937534, //#零弥子yyds#
		991039497, //607
		// 533200889, //2021软协
		// 598445021, //西工大的猫猫MINECRFT
	].indexOf(e) != -1;
};

doReply = (e, s) =>
{
	if (s != lastMessage)
	{
		e.reply(s);
		lastMessage = s;
	}
};

forceReply = (e, s) =>
{
	e.reply(s);
};

uploadImage = (file) =>
{
	client.preloadImages([file]).then((e) => {
		console.log(JSON.stringify(e));
	});
}

parseMsg = (message) =>
{
	metamsg = {
		text: [],  //文本消息 { text }
		at: [],    //@ { qq, text }
		face: [],  //表情 { id, text }
		image: [], //图片 { file, url }
		cmd: []    //命令 { cmd, argv }
	};
	for (i = 0; i < message.length; ++i)
	{
		var e = message[i];
		switch (e.type)
		{
			case 'text':
				text = e.data.text.trim();
				if (text[0] == '.')
				{
					tmp = text.slice(1);
					if (tmp.length == 0) break;
					tmp = tmp.split(' ').filter((e) => e != '');
					cmd = tmp[0];
					argv = tmp.slice(1);
					metamsg.cmd.push({
						cmd: cmd,
						argv: argv
					});
				} else
				{
					metamsg.text.push({
						text: text
					});
				}
				break;
			case 'at':
				metamsg.at.push({
					qq: e.data.qq,
					text: e.data.text
				});
				break;
			case 'face':
				metamsg.face.push({
					id: e.data.id,
					text: e.data.text
				});
				break;
			case 'image':
				metamsg.image.push({
					file: e.data.file,
					url: e.data.url
				});
				break;
			default:
				console.log('[INFO] Unknown message type ' + e.type);
		}
	}
	return metamsg;
}

//监听上下线事件
client.once('system.online',  () => console.log('Logged in!'));
client.once('system.offline', () => console.log('Logged out!'));

function envNormalCallback(event)
{
	msg = parseMsg(event.message);

	for (i = 0; i < msg.cmd.length; ++i)
	{
		cmd = msg.cmd[i];

		switch(cmd.cmd)
		{
			case 'wake':
				if (cmd.argv.indexOf('--no-reply') == -1)
				{
					if (active)
					{
						doReply(event, '人家醒着呐，别叫了！')
					} else
					{
						doReply(event, '唔呣，睡饱了，梓言起床啦！\n[CQ:image,file=assets/good-morning.jpg]');
					}
				}
				active = true;
				continue;
			case 'sleep':
				if (cmd.argv.indexOf('--no-reply') == -1)
				{
					if (active)
					{
						doReply(event, '那我先去睡觉啦，记得叫我哦~');
					}
				}
				active = false;
				continue;
		}

		if (!active) return;

		switch (cmd.cmd)
		{
			case 'help':
				helppage =
					'梓言的n种使用方法（害羞o(*////▽////*)q\n'+
					'\t.help: 梓言亲自教你怎么玩我哦~\n'+
					'\t.exit: 呜呜呜，把梓言踢下线（信不信我咬你哇！嗷呜~\n'+
					'\t.env <environment=[normal|javascript]>: 偷偷换掉梓言的灵魂什么的，也不是不可以……\n'+
					'\t.sleep [--no-reply]: 那我先去睡觉啦，记得叫我哦~\n'+
					'\t.wake [--no-reply]: 唔呣，睡饱了，梓言起床啦！\n'+
					'\t.send <msg...>: 强……强迫梓言说话！\n'+
					'\t.p24 <target=24> [--skip|--force] 来一局精彩刺激的24点游戏吧！'
				doReply(event, helppage);
				break;
			case 'exit':
				if (event.sender.user_id == admin)
				{
					doReply(event, 'Bye~ 我要下线了o(╥﹏╥)o');
					client.logout();
				} else
				{
					doReply(event, '杂修！你也想赶走老娘吗？！o(*≧д≦)o!!');
				}
				break;
			case 'send':
				doReply(event, cmd.argv.join(' '));
				break;
			case 'p24':
				if (p24_group != null && event.group_id != p24_group) return;
				if (cmd.argv.indexOf('--skip') != -1)
				{
					if (p24_group == null)
					{
						doReply(event, '游戏还没开始呢，再这样梓言可是会生气的！o(≧口≦)o');
					} else
					{
						doReply(event, '真的有那么难吗？梓言摸头.jpg\n'
							+ '这是梓言做出来的哦，要不……你看一下？(*•ω•)\n'
							+ calc24(p24_target, p24_nums).join('\n'));
						p24_group = null;
					}
				} else
				{
					if (p24_group != null)
					{
						forceReply(event, '游戏正在进行中哦！试试从['
							+ p24_nums.join(',') + ']得到'
							+ String(p24_target) + '吧！');
					} else
					{
						maybeTarget = cmd.argv.findIndex((e) => e[0] != '-');
						n = maybeTarget == -1 ? 24 : Number(cmd.argv[maybeTarget]);
						if (isNaN(n))
						{
							doReply(event, '唔呣，你给我的数字`'
								+ cmd.argv[maybeTarget]
								+ '`梓言不认识呀，我们还是算24吧？(≧ｗ≦；)');
							n = 24;
						}
						p24_group = event.group_id;
						p24_remain = 3;
						p24_target = n;

						if (cmd.argv.indexOf('--force') != -1)
						{
							while (p24_nums = gen24(p24_target), p24_nums.length == 0);
						} else
						{
							p24_nums = gen24(p24_target);
						}

						p24_nums = p24_nums.slice(0, 8);

						if (p24_nums.length == 0)
						{
							p24_group = null;
							forceReply(event, '啊啊啊，好大的数，梓言凑不出来了！呜呜(〃＞＿＜;〃)');
						} else
						{
							doReply(event, '铛铛铛！24点游戏开始啦！\n这次是要从['
								+ p24_nums.join(',') + ']四则运算得到'
								+ String(p24_target) + '；一共有3次机会哦~');
						}
					}
				}
				break;
			default:
				doReply(event, '`' + cmd.cmd + '`是什么命令呀？梓言还不会呐(⊙▽⊙)#');
				break;
		}
	}

	if (!active) return;

	calledMe = false
	for (i = 0; i < msg.at.length; ++i)
	{
		if (msg.at.findIndex((e) => e.qq == account) != -1)
		{
			atText = event.sender.sex == 'male' ? '小哥哥' : '臭妹妹';
			msg = '[CQ:at,qq=' + String(event.sender.user_id) + '] ';
			msg += atText + '@我干嘛呀？(*/ω＼*)';
			doReply(event, msg);
			calledMe = true;
			break;
		}
	}

	if (msg.text.length > 0 && !calledMe)
	{
		if (p24_group != null && p24_check(event.raw_message))
		{
			try {		//判断是否为24点游戏的回复
				target = evaluate(event.raw_message);
				if (Math.abs(target - p24_target) < 1e-6)
				{
					doReply(event, '[CQ:at,qq=' + String(event.sender.user_id)
						+ '] 好腻害！答对啦(*^▽^*)！')
					p24_group = null;
				} else
				{
					console.log('[INFO] 我的答案：' + String(target));
					--p24_remain;
					if (p24_remain > 0)
					{
						doReply(event, '[CQ:at,qq=' + String(event.sender.user_id)
							+ '] 好可惜，答错了呐！还剩下' + String(p24_remain) + '次机会哦！');
					} else
					{
						doReply(event, '啊，错完了呢！真的有那么难吗？梓言摸头.jpg');
						doReply(event, '这是梓言做出来的哦，要不……你看一下？(*•ω•)\n'
							+ calc24(p24_target, p24_nums).join('\n'));
						p24_group = null;
					}
				}
				return;
			} catch {	//无效的表达式，假定该为普通消息
				
			}
		}
		doReply(event, '【虽然没有人call我But！】我是喝了假酒的梓言！rua~');
	}
}

function envJavaScriptCallback(event)
{
	function wrap(e)
	{
		return JSON.stringify(e);
	};
	script = parseMsg(event.message).text.map((e) => e.text).join('');
	script = script.replace('console.log(', 'doReply(event, ');
	try {
		ret = eval(script);
		if (ret != undefined)
		{
			doReply(event, String(ret));
		}
	} catch(e) {
		doReply(event, e.message);
	}
}

var envCallbacks = {
	'normal': envNormalCallback,
	'javascript': envJavaScriptCallback
};

//监听消息事件
client.on('message', (event) => {
	if (!isGroupSupport(event.group_id)) return;

	//检测是否为环境切换指令
	ss = event.raw_message.trim().split(' ').filter((e) => e != '');
	if (ss[0] == '.env')
	{
		if (ss.length == 2)
		{
			if (isEnvSupport(ss[1]))
			{
				if (env != ss[1])
				{
					env = ss[1];
					doReply(event, '<冷冰冰的声音>: 迎接新的我');
				}
			} else
			{
				doReply(event, '<冷冰冰的声音>: 无效环境 `' + ss[1] + '`');
			}
		} else
		{
			doReply(event, '<冷冰冰的声音>: 非法环境操作');
		}
	} else
	{
		envCallbacks[env](event);
	}

});

client.on('notice.group.poke', (event) => {
	if (event.target_id == account)
	{
		client.sendGroupMsg(event.group_id, 'o(>﹏<)o不要啊~');
	}
});

//登录
client.on('system.login.slider', function (event) {
		process.stdin.once('data', (input) => {
		this.sliderLogin(input);
	});
}).on('system.login.device', function (event) {
		process.stdin.once('data', () => {
		this.login();
	});
}).login('********');
