"use strict";

const path = require('path');
const Jimp = require('jimp');

class Puzzle
{
	constructor(fnpath, cols, rows)
	{
		Jimp.read(path.resolve(__dirname, fnpath)).then((e) => {
			this.source      = e;
			this.width       = e.bitmap.width;
			this.height      = e.bitmap.height;
			this.background  = new Jimp(this.width, this.height, 0xffffffff);
			this.unit_width  = this.width  / cols;
			this.unit_height = this.height / rows;
			this.puzzles     = new Array(cols * rows);
			for (let i = 0; i < this.puzzles.length; ++i)
			{
				let x  = i % cols;
				let y  = Math.floor(i / cols);
				
				let px = Math.floor(x * this.unit_width);
				let py = Math.floor(y * this.unit_height);

				let w  = Math.floor(this.unit_width);
				let h  = Math.floor(this.unit_height);

				if (px + w > this.width) w = this.width - px;
				if (py + h > this.height) h = this.height - py;

				this.puzzles[i] = { x: x, y: y, index: i, image: null };
				this.source.crop(px, py, w, h, (e, j) => {
					this.puzzles[i].image = j;
					console.log(`[WARN] ${e.message}`);
				});
			}
			this.puzzles = this.puzzles.sort(() => Math.random() - 0.5);
		}).catch((e) => {
			console.error(`[ERROR] plugin.puzzle: ${e.message}`);
		});
	}
}

module.exports =
{
	Puzzle
};