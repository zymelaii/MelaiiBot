const { coloredStringify } = require('./utils');
const { preparse } = require('./parser');

function parseMsg(message)
{
	var metamsg = {
		cmd:    [], //命令 { cmd, argv }
		text:   [], //文本消息 { text }
		at:     [], //@ { qq, text }
		face:   [], //表情 { id, text }
		image:  [], //图片 { file, url }
		xml:    [], //xml文档 { data, type }
		record: []  //录音 { file, url }
	};

	if (message == null) return metamsg;

	for (var i = 0; i < message.length; ++i)
	{
		var e = message[i];
		switch (e.type)
		{
			case 'text':
				var text = e.data.text.trim();
				if (text[0] == '.')
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