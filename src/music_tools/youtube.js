const play = require('play-dl');


async function findYoutubeUrl(query) {
    console.log(`Wyszukiwanie: ${query}`);
    
    const searchResults = await play.search(query, { limit: 1 });
    if (searchResults.length === 0) {
        console.error("Nie znaleziono utworu na YouTube.");
        return;
    }

    console.log(`Znaleziono: ${searchResults[0].url}`);
    return searchResults[0].url;
}

async function extractYoutubePlaylistUrls(playlistUrl) {
    const playlist = await play.playlist_info(playlistUrl, { incomplete: true });
    const videos = await playlist.all_videos();
    return videos.map(video => video.url);
}

module.exports = {
    findYoutubeUrl,
    extractYoutubePlaylistUrls
};
