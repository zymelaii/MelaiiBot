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
	return String(num).split('')
		.map((e) => charset[Number(e)])
		.join('');
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