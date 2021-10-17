"use strict";

const { toBigChineseNum } = require('../../lib/utils');

function toNormalStyle(num)
{
	return Number(num);
}

function toBigChineseStyle(num)
{
	return toBigChineseNum(num);
}

function toCircledNumberStyle(num)
{
	const charset = '〇①②③④⑤⑥⑦⑧⑨';
	let text = String(num).split('')
		.map((e) => charset[Number(e)])
		.join('');
	if (Number(num) < 0) text = '-' + text;
	return text;
 }

const rpStyles =
{
	normal: toNormalStyle,
	bigcn: toBigChineseStyle,
	circled: toCircledNumberStyle
};

module.exports =
{
	rpStyles
};