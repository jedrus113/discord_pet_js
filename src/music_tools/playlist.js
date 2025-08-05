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
        console.warn(error);
    }

}

async function makeQueThenJoin(guild, voiceChannel) {
    await player.extractors.register(YoutubeiExtractor);
    const queue = player.nodes.create(guild);
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
    });
})();


module.exports = {
    addSongToPlaylist,
    makeQueThenJoin,
};
