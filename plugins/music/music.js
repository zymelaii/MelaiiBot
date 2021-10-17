"use strict";

const netease = require('./netease_api');
const { strSimilarityByEditDistance } = require('../../lib/utils');

async function selectNBestSongs(songName, songs, accept)
{
	var results = songs.map((e) => {
		return {
			name: e.name,
			id: e.id,
			artists: e.artists.map((e) => e.name).join('/'),
			popularity: 0,
			difference: {
				editdist: strSimilarityByEditDistance(e.name, songName),
				include: e.name.indexOf(songName) != -1
					|| songName.indexOf(e.name.trim()) != -1
			}
		};
	});

	return await netease.batchCountOfComment(results.map((e) => e.id))
		.then((e) => {
			for (let i in e) results[i].popularity = e[i];
			
			results = results.sort((a, b) => {
				const diffa = a.difference;
				const diffb = b.difference;

				const edcase = diffa.editdist > diffb.editdist ? 1 : -1;
				const ppcase = a.popularity < b.popularity ? 1 : -1;

				if (diffa.include && !diffb.include) return -1;
				if (!diffa.include && diffb.include) return  1;

				return edcase == -1 ? ppcase : edcase;
			});
			
			return results.slice(0, accept);
		}).catch((e) => {
			console.error(`[ERROR] music.selectNBestSongs: ${e.message}`);
			return null;
		});
}

module.exports =
{
	selectNBestSongs
};