# MelaiiBot
该项目基于OICQ进行二次开发，旨在提供易于拓展的QQ机器人接口。

### 登录
```js
const { MelaiiBot } = require('./lib/bot');

const account  = /*your qq account*/;
const password = /*your qq password*/;
MyBot = new MelaiiBot(account);
MyBot.login(password);

/// 为机器人添加监听函数
//! MelaiiBot.addListner(event, name, callback)
//! @param: event: String 事件类型（详情见OICQ）
//! @param: name: String 监听单元标识（"_"为保留标识不可用）
//! @param: callback: Function 事件回调
/// @return: void
//! 上线消息
MyBot.addListener('system.online', 'OnlineEvent', (info) => {
	console.log('QQ机器人已上线');
});

//! 下线消息
MyBot.addListener('system.offline', 'OnlineEvent', (info) => {
	console.log('QQ机器人掉线了！');
});
```

### 消息
```js
//! 启动QQ机器人同上

//! 普通群消息（区分于匿名群消息）
MyBot.addListener('message.group.normal', 'port-1', (info) => {
	const bot   = info.bot;       //! 当前机器人
	const event = info.event;     //! 事件数据
	const gid   = event.group_id; //! 消息发送的群编号
	const uid   = event.user_id;  //! 消息发送的群成员编号

	//! 原始消息（更多细节见OICQ）
	const raw_msg = event.raw_message;

	/// 消息过长发送警告
	//! MelaiiBot.sendGroupMsg(gid, msg)
	//! @param: gid: Number 目标群编号
	//! @param: msg: String 待发送消息
	/// @return: Response
	if (raw_msg.length > 1024)
	{
		bot.sendGroupMsg(gid, '消息太长了！');
	}
});

//! 普通私聊消息
MyBot.addListener('message.private.normal', 'port-2', (info) => {
	const bot   = info.bot;
	const event = info.event;
	const uid   = event.user_id;

	//! 简单的回复
	bot.sendPrivateMsg(uid, '你好，我叫Melaii，很高兴认识你！');
});

//! 普通私聊消息（二）
MyBot.addListener('message.private.normal', 'port-3', (info) => {
	const bot   = info.bot;
	const event = info.event;
	const uid   = event.user_id;

	const raw_msg = event.raw_message;

	if (raw_msg == '删除当前回调函数')
	{	//! 注销监听单元
		bot.delListener('message.private.normal', 'port-3');
	}
});
```

### 插件
MelaiiBot的插件具有统一的格式。<br/>
一个名为`${PLUGIN}`的插件应当被安装到`/plugins/${PLUGIN}`目录下并拥有以下结构：<br/>
* `/plugins/${PLUGIN}/${PLUGIN}_listener.js` `neccessary`<br/>
* `/plugins/${PLUGIN}/${PLUGIN}.js` `optional`<br/>
* `/plugins/${PLUGIN}/${PLUGIN}.json` `optional`<br/>
* `/plugins/${PLUGIN}/...` `optional`<br/>