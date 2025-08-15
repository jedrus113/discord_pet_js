const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');

function isYoutubeUrl(url) {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url);
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

    if (typeof input === 'string' && isYoutubeUrl(input)) {
        video = { url: input, title: 'Unknown' }; 
    } 
    else if (input?.url && isYoutubeUrl(input.url)) {
        video = input;
    } else {
        console.error('Invalid video input. Must be a YouTube URL or a video object.');
        return null;
    }

    try {
        const stream = ytdl(video.url, {
            filter: 'audioonly',
            highWaterMark: 1 << 25,
            quality: 'highestaudio'
        });

        return {
            title: video.title || 'Unknown',
            url: video.url,
            stream: stream,
            type: 'stream'
        };
    } catch (err) {
        console.error(`Failed to get stream for ${video.url}:`, err.message);
        return null;
    }
}

module.exports = {
    findYoutubeUrl,
    getStream,
    isYoutubeUrl
};