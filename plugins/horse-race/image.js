"use strict";

const fs = require('fs');
const path = require('path');
const trueTo256 = require('../../lib/trueTo256');
const Jimp = require('jimp');
const { GifFrame, GifUtil } = require('gifwrap');

async function dummy()
{
	const WIDTH  = 800;
	const HEIGHT = 400;

	const background = new GifFrame(WIDTH, HEIGHT, 0xFFFFFFFF);
	var horse = await Jimp.read(path.resolve(__dirname, './assets/horse-1.png'));

	const total  = 64;
	const margin = { x: 8, y: (HEIGHT - horse.bitmap.height) / 2 };
	const step   = (WIDTH - margin.x * 2 - horse.bitmap.width) / total;

	let frames = [];
	for (let i = 0; i < total; ++i)
	{
		const jimpFrame = GifUtil.copyAsJimp(Jimp, background);
		jimpFrame.composite(horse, margin.x + i * step, margin.y);
		frames.push(new GifFrame(trueTo256(jimpFrame.bitmap)));
	}

	GifUtil.write("./assets/dummy.gif", frames, { loops: 1 })
	.then(gif => {
    	console.log("written");
	});
}

module.exports =
{
	dummy
};