"use strict";

const util = require('util');
const async_request = require('request-promise');
const { COMUSED_UNICN } = require('./unicn');

const RANDOM_ENGINE = require('seed-random')(Date.now());

function strSimilarityByCos(s1, s2)
{
	let vs1 = s1.split('');
	let vs2 = s2.split('');

	let l1 = [...new Set(vs1)];
	let l2 = [...new Set(vs2)];
	let l = [...new Set(l1.concat(l2))];

	let v1 = l.map((e) => vs1.filter((u) => u == e).length);
	let v2 = l.map((e) => vs2.filter((u) => u == e).length);

	var sqs1 = 0;
	var sqs2 = 0;
	var dot  = 0;
	for (var i = 0; i < l.length; ++i)
	{
		sqs1 += v1[i] * v1[i];
		sqs2 += v2[i] * v2[i];
		dot  += v1[i] * v2[i];
	}

	let ans = dot / (Math.sqrt(sqs1) * Math.sqrt(sqs2));

	return ans > 1 ? 1 : ans;
}

function strSimilarityByEditDistance(s1, s2)
{
	const len1 = s1.length;
	const len2 = s2.length;

	let matrix = [];

	for (let i = 0; i <= len1; ++i)
	{
		matrix[i] = [];
		for (let j = 0; j <= len2; ++j)
		{
			if (i == 0)
			{
				matrix[i][j] = j;
			} else if (j == 0)
			{
				matrix[i][j] = i;
			} else {
				let cost = 0;
				if (s1[i - 1] != s2[j - 1]) cost = 1;
				const temp = matrix[i - 1][j - 1] + cost;
				matrix[i][j] = Math.min(
					matrix[i - 1][j] + 1,
					matrix[i][j - 1] + 1, temp);
			}
		}
	}

	return matrix[len1][len2];
}

function coloredStringify(ele)
{
	return util.inspect(ele, false, null, true)
}

async function asyncRequest(url)
{
	return await async_request(encodeURI(url));
}

function toBigChineseNum(num)
{
	if (num == 0) return '〇';

	var input = String(num).match(/[0-9]/ig)
	if(input.length > 10) throw new Error('[ERROR] toBigChineseNum: number is too long');

	const charset = '零壹贰叁肆伍陆柒捌玖';
	const units = '拾佰仟万亿';

	var tmp = '';

	for(var i = 0; i < input.length; ++i)
	{
		tmp += charset[Number(input[i])];

		switch (input.length - i - 1)
		{
			case 0: break;
			case 1: if (input[i] != 0) tmp += "拾"; break;
			case 2: if (input[i] != 0) tmp += "佰"; break;
			case 3: if (input[i] != 0) tmp += "仟"; break;
			case 4: tmp += "万"; break;
			case 5: if (input[i] != 0) tmp += "拾"; break;
			case 6: if (input[i] != 0) tmp += "佰"; break;
			case 7: if (input[i] != 0) tmp += "仟"; break;
			case 8: tmp += "亿"; break;
			case 9: tmp += "拾"; break;
		}
	}

	while (tmp.search("零零") != -1
		|| tmp.search("零亿") != -1
		|| tmp.search("亿万") != -1
		|| tmp.search("零万") != -1)
	{
		tmp = tmp.replace("零亿", "亿");
		tmp = tmp.replace("亿万", "亿");
		tmp = tmp.replace("零万", "万");
		tmp = tmp.replace("零零", "零");
	}

	if (tmp.indexOf("壹拾") == 0)
	{
		tmp = tmp.substr(1);
	}

	if (tmp.lastIndexOf("零") == tmp.length - 1)
	{
		tmp = tmp.substr(0, tmp.length - 1);
	}

	if (num < 0)
	{
		tmp = '负' + tmp;
	}

	return tmp;
}

function unescapeHTML(rawstr)
{
	const HTML_DECODE =
	{
		'&nbsp;':   ' ',
		'&#160;':   ' ',
		'&lt;':     '<',
		'&#60;':    '<',
		'&gt;':     '>',
		'&#62;':    '>',
		'&amp;':    '&',
		'&#38;':    '&',
		'&quot;':   '"',
		'&#34;':    '"',
		'&apos;':   '\'',
		'&#39;':    '\'',
		'&cent;':   '￠',
		'&#162;':   '￠',
		'&pound;':  '£',
		'&#163;':   '£',
		'&yen;':    '¥',
		'&#165;':   '¥',
		'&sect;':   '§',
		'&#167;':   '§',
		'&copy;':   '©',
		'&#169;':   '©',
		'&reg;':    '®',
		'&#174;':   '®',
		'&times;':  '×',
		'&#215;':   '×',
		'&divide;': '÷',
		'&#247;':   '÷',
		'&#91;':    '[',
		'&#93;':    ']'
    };
	
	let s = rawstr;

	for (let key in HTML_DECODE)
	{
		s = s.replace(key, HTML_DECODE[key]);
	}

	return s;
}

function random(minval, maxval)
{
	return RANDOM_ENGINE() * (maxval - minval + 1) + minval;
}

function randomInt(minval, maxval)
{
	return Math.floor((RANDOM_ENGINE() * (maxval - minval + 1) + minval));
}

function decodeUnicode(str)
{
   str = "\\u" + str
   str = str.replace(/\\/g, "%");
   str = unescape(str);
   str = str.replace(/%/g, "\\");
   return str;
}

///
//! @desc: 获取定长的随机中文字符串
///
function randomCN(length)
{
	let cnstr = "";

	for(let i = 0; i < length; ++i)
	{
		let unicode = randomInt(0x4e00, 0x9fa5).toString(16);
		cnstr += decodeUnicode(unicode);
	}

	return cnstr;
}

///
//! @desc: 获取定长的随机常用中文字符串
///
function randomCNCommon(length)
{
	const len = COMUSED_UNICN.length;
	
	let cnstr = "";
	for(let i = 0; i < length; ++i)
	{
		cnstr += COMUSED_UNICN[randomInt(0, len - 1)];
	}
	
	return cnstr;
}

///
//! @desc: 尝试解析为json
//! @return: { status: Boolean, data: Json }
///
function parseAsJson(input)
{
	try {
		let result = JSON.parse(input);
		return { status: typeof(result) == 'object', data: result };
	} catch {
		return { status: false, data: input };
	}
}

module.exports =
{
	strSimilarityByCos,
	strSimilarityByEditDistance,
	coloredStringify,
	asyncRequest,
	toBigChineseNum,
	unescapeHTML,
	random,
	randomInt,
	randomCN,
	randomCNCommon,
	parseAsJson
};