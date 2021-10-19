const { coloredStringify } = require('./utils');
const { preparse } = require('./parser');

function parseMsg(message, hascmd = true)
{
	var metamsg = {
		cmd:    [], //命令 { cmd, argv }
		text:   [], //文本消息 { text }
		at:     [], //@ { qq, text }
		face:   [], //表情 { id, text }
		bface:  [], //原创表情 { file, text }
		image:  [], //图片 { file, url }
		xml:    [], //xml文档 { data, type }
		record: [], //录音 { file, url }
		json:   [], //json文档 { data }
		reply:  [], //消息回复 { id }
		file:   [], //文件 { name, url, size, md5, duration, busid, fileid, fid }
		video:  [], //视频 { file, url }
		dice:   [], //骰子 { id }
		rps:    []  //猜拳 { id }
	};

	if (message == null) return metamsg;

	for (var i = 0; i < message.length; ++i)
	{
		var e = message[i];
		switch (e.type)
		{
			case 'text':
				var text = e.data.text.trim();
				while (text = text.replace('\r', '\n'), text.indexOf('\r') != -1);
				if (text[0] == '.' && hascmd)
				{
					var tmp = text.slice(1);
					if (tmp.length == 0) break;

					var [cmd, argv] = preparse(tmp);
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
			break;
			case 'bface':
				metamsg.bface.push({
					id: e.data.file,
					text: e.data.text
				});
			break;
			case 'image':
				metamsg.image.push({
					file: e.data.file,
					url: e.data.url
				});
			break;
			case 'xml':
				metamsg.xml.push({
					data: e.data.data,
					type: e.data.type
				});
			break;
			case 'record':
				metamsg.record.push({
					file: e.data.data, //@protobuf://...
					url: e.data.type
				});
			break;
			case 'json':
				metamsg.record.push({
					data: e.data.data,
				});
			break;
			case 'reply':
				metamsg.record.push({
					id: e.data.id
				});
			break;
			case 'file':
				metamsg.file.push({
					name: e.data.name,
					url: e.data.url,
					size: e.data.size,
					md5: e.data.md5,
					duration: e.data.duration,
					busid: e.data.busid,
					fileid: e.data.fileid,
					fid: e.data.fid
				});
			break;
			case 'video':
				metamsg.record.push({
					file: e.data.file, //@protobuf://...
					url: e.data.url
				});
			break;
			case 'dice':
				metamsg.dice.push({
					id: e.data.id
				});
			break;
			case 'rps':
				metamsg.rps.push({
					id: e.data.id
				});
			break;
			default:
				console.log('[INFO] Unknown message type ' + e.type + ':', e);
		}
	}

	// console.log('[INFO] parsed message:', coloredStringify(metamsg));

	return metamsg;
}

module.exports =
{
	parseMsg
};