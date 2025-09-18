const ytdl = require('@distube/ytdl-core');
const ytpl = require('@distube/ytpl');
const ytSearch = require('yt-search');
const MyDiscordServersManager = require('../discord_tools/server_class');


function youtubeIsPlaylist(url) {
  return url.includes('list=');
}


async function handleYTRequest(url, interaction) {
    if (youtubeIsPlaylist(url)) return await handleYTPlaylistRequest(url, interaction);
    return await handleYTVideoRequest(url, interaction);
}


async function handleYTPlaylistRequest(playlistUrl, interaction) {
    const playlist = await ytpl(playlistUrl, { pages: Infinity });

    for (const video of playlist.items) {
        video.description = playlist.title || "No description";
        await addStreamToPlaylist(video, interaction);
    }
}


async function handleYTVideoRequest(videoUrl, interaction) {
    let videoId;
    if (videoUrl.startsWith("https://youtu.be/")) {
        // short youtube url youtu.be/videoId?blabla
        videoId =  videoUrl.split('/').pop().split('?')[0];
    } else {
        // full youtube url youtube.com/blablabla?v=videoId&blabla
        videoId = new URLSearchParams(new URL(videoUrl).search).get('v');
    }

    const video = await ytSearch({ videoId: videoId } );
    await addStreamToPlaylist(video, interaction);
}


// serach
async function handleYTSearchRequest(searchQueryStr, interaction) {
    console.log(`Wyszukiwanie: ${searchQueryStr}`);

    const searchResults = await ytSearch(searchQueryStr);
    if (!searchResults?.videos?.length) {
        return null;
    }

    const video = searchResults.videos[0];
    console.log(`Znaleziono: ${video.url}`);

    await addStreamToPlaylist(video, interaction);
}


async function addStreamToPlaylist(videoStream, interaction) {

    const stream = ytdl(videoStream.url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
        quality: 'highestaudio'
    });

    const streamData = {
        title: videoStream.title || 'Unknown',
        url: videoStream.url,
        stream,
        type: 'stream',
        interaction: interaction,
        ytData: videoStream,
    };
    const guildManager = MyDiscordServersManager.get(interaction.guild.id);
    await guildManager.addToPlaylist(streamData);
}


module.exports = {
    handleYTRequest,
    handleYTSearchRequest,
};