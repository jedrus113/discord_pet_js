const ytdl = require('@distube/ytdl-core');
const ytpl = require('@distube/ytpl');
const ytSearch = require('yt-search');

function youtubeIsPlaylist(url) {
  return url.includes('list=') ? 'playlist' : 'video';
}




async function extractYoutubePlaylistUrls(playlistUrl) {
    const playlistId = await ytpl.getPlaylistID(playlistUrl);

    if (playlistId.startsWith("RD")) {
        throw new Error("Mix playlists are not supported.");
    }

    const playlist = await ytpl(playlistUrl, { pages: Infinity });
    return playlist.items.map(item => `https://www.youtube.com/watch?v=${item.id}`);
}

async function findYoutubeUrl(query) {
    console.log(`Wyszukiwanie: ${query}`);
    
    const searchResults = await ytSearch(query);
    if (!searchResults?.videos?.length) {
        return null;
    }

    const video = searchResults.videos[0];
    console.log(`Znaleziono: ${video.url}`);
    return video;
}

async function getStream(input) {
    let video;

    if (youtubeIsPlaylist(input)) {
        video = input;
    } else {
        video = { url: input, title: 'Unknown' };
    }

    try {
        const stream = ytdl(video.url, {
            filter: 'audioonly',
            highWaterMark: 1 << 25,
            quality: 'highestaudio'
        });

        stream.on('error', err => {
            if (err.message.includes("Sign in to confirm your age") || err.message.includes("This video is age-restricted")) {
                console.warn(`Skipping age-restricted video: ${video.url}`);
            } else {
                // FUCKASS LMAO
                return {
                    title: video.title || 'Unknown',
                    url: video.url,
                    stream,
                    type: 'stream'
                };
            }
        });

        return {
            title: video.title || 'Unknown',
            url: video.url,
            stream,
            type: 'stream'
        };
    } catch (err) {
        if (err.message.includes("Sign in to confirm your age") || err.message.includes("This video is age-restricted")) {
            console.warn(`Skipping age-restricted video: ${video.url}`);
        } else {
            console.error(`Failed to get stream for ${video.url}:`, err.message);
        }
        return null;
    }
}


module.exports = {
    findYoutubeUrl,
    getStream,
    youtubeIsPlaylist,
    extractYoutubePlaylistUrls
};