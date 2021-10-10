const fs = require('fs');
const { BitmapImage, GifFrame, GifUtil, GifCodec } = require('gifwrap');
const Jimp = require('jimp');
const path = require('path');

Jimp.read('./assets/horse-1.png', (err, data) => {
	var horse = data;
	var backgroud;

	console.log(horse);

	var frames = [new GifFrame(new BitmapImage(horse.bitmap))];

	// backgroud = new Jimp(200, 48, 0xffffffff);
	// backgroud.composite(horse, 0, 0)
	// frames.push(new GifFrame(backgroud.bitmap, { delayCentisecs: 25 }));
	
	// backgroud = new Jimp(200, 48, 0xffffffff);
	// backgroud.composite(horse, 24, 0);
	// frames.push(new GifFrame(backgroud.bitmap, { delayCentisecs: 25 }));
	
	// backgroud = new Jimp(200, 48, 0xffffffff);
	// backgroud.composite(horse, 48, 0);
	// frames.push(new GifFrame(backgroud.bitmap, { delayCentisecs: 25 }));
	
	// backgroud = new Jimp(200, 48, 0xffffffff);
	// backgroud.composite(horse, 72, 0);
	// frames.push(new GifFrame(backgroud.bitmap, { delayCentisecs: 25 }));

	GifUtil.write("modified.gif", frames, { loop: 1 }).then((outputGif) => {
        console.log("modified");
    }).catch((e) => {
    	console.log("failed. (", e.message, ")")
    });

});