const { Player, GuildQueueEvent  } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeiExtractor } = require('discord-player-youtubei')
const { findYoutubeUrl } = require('./youtube')
const client = require('../discord_tools/client');


const player = new Player(client, {
    registerDefaultCommands: false,
});

async function addSongToPlaylist(queue, title, artist) {
    const query = `${title} ${artist}`;
    const url = await findYoutubeUrl(query);
    console.log(`adds to ques ${query} - ${url}`)
    try {
        await queue.play(url);
    } catch (error) {
        console.warn("ERRO WHILE PLAYING")
        console.warn(error);
    }

}

async function addYTSongToPlaylist(queue, yt_link) {
    const url = yt_link;
    console.log(`adds to ques YT - ${url}`)
    try {
        await queue.play(url);
    } catch (error) {
        console.warn("ERRO WHILE PLAYING")
        console.warn(error);
    }

}

async function addYTPlaylist(queue, playlistUrl) {
    try {
        const urls = await extractYoutubePlaylistUrls(playlistUrl);
        console.log(`Dodano ${urls.length} utworów z playlisty YT: ${playlistUrl}`);
        for (let url of urls) {
            try {
                console.log(`Dodaję do kolejki: ${url}`);
                await queue.play(url);
            } catch (err) {
                console.warn("Błąd przy dodawaniu utworu z YT playlisty:", err.message);
            }
        }
    } catch (err) {
        console.warn("Błąd podczas pobierania playlisty YT:", err.message);
    }
}

async function makeQueThenJoin(guild, voiceChannel) {
    await player.extractors.register(YoutubeiExtractor);
    const queue = player.nodes.create(guild);

    process.on('uncaughtException', (err) => {
        console.error('Unhandled Exception:', err);
        queue.node.skip();
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Promise rejection:', reason);
        queue.node.skip();
    });

    return await queue.connect(voiceChannel);
}


(async () => {
    //await player.extractors.register(YoutubeiExtractor);
    console.log("EXTRASKTOR USTAWIONY!")

    player.events.on(GuildQueueEvent.PlayerStart, async (queue, track) => {
        console.log(`Now playing: ${track.title}`);
    });

    // Handle the event when a track finishes playing
    player.events.on(GuildQueueEvent.PlayerFinish, async (queue, track) => {
        console.log(`Finished playing ${track.title}`);
    });

    player.events.on('error', (queue, error) => {
        // Emitted when the player queue encounters error
        console.log(`General player error event: ${error.message}`);
        console.log(error);
    });

    player.events.on('playerError', (queue, error) => {
        // Emitted when the audio player errors while streaming audio track
        console.log(`Player error event: ${error.message}`);
        console.log(error);
        queue.node.skip();
    });
})();


module.exports = {
    addSongToPlaylist,
    addYTSongToPlaylist,
    makeQueThenJoin,
    addYTPlaylist,
    player,
};
