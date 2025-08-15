const { Player, GuildQueueEvent  } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeiExtractor } = require('discord-player-youtubei')
const { SoundcloudExtractor } = require('discord-player-soundcloud');
const { findYoutubeUrl, extractYoutubePlaylistUrls } = require('./youtube')
const { findSoundCloudUrl } = require('./soundcloud');
const client = require('../discord_tools/client');


const player = new Player(client, {
    registerDefaultCommands: false,
});


async function addSoundCloudSongToPlaylist(queue, title, artist) {
    const query = `${artist} ${title}`;
    const url = await findSoundCloudUrl(query);
    if (!url) {
        console.warn("No SoundCloud track found.");
        return;
    }
    try {
        await queue.play(url);
    } catch (error) {
        console.warn("Error while playing SoundCloud track");
        console.warn(error);
    }
}

async function addSongToPlaylist(queue, title, artist) {
    const query = `${title} ${artist}`;
    const url = await findYoutubeUrl(query);
    console.log(`adds to ques ${query} - ${url}`)
    try {
        await queue.play(url);
    } catch (error) {
        console.warn("ERRO WHILE PLAYING PLAYLIST")
        console.warn(error);
    }

}

async function addYTSongToPlaylist(queue, yt_link) {
    const url = yt_link;
    console.log(`adds to ques YT - ${url}`)
    try {
        await queue.play(url);
    } catch (error) {
        console.warn("ERRO WHILE PLAYING YT SPMG TP ")
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
                if(!queue.connection) break;
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
    let queue = player.nodes.create(guild, {
        // player node options
        leaveOnEmpty: true,               // bot leaves when voice channel is empty
        leaveOnEmptyCooldown: 300000,     // 5 minutes in milliseconds
        leaveOnEnd: true,                  // still leave when queue finishes
        leaveOnEndCooldown: 0              // no extra delay after queue end
    });

    try {
        return await queue.connect(voiceChannel);
    } catch (error) {
        console.error("Error connecting to voice channel:", error);
        throw error;
    }
}




process.on('uncaughtException', (err) => {
    console.error('Unhandled Exception:', err);

    // iterate over guilds that have queues
    for (const guildId of Object.keys(player.nodes.cache ?? {})) {
        const queue = player.nodes.get(guildId);
        if (queue) {
            console.log(`Error on guild ${guildId}`);
            //console.log(queue.currentTrack);
            //console.log(queue.tracks.toArray());
        }
    }

});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise rejection:', reason);

    // iterate over guilds that have queues
    for (const guildId of Object.keys(player.nodes.cache ?? {})) {
        const queue = player.nodes.get(guildId);
        if (queue) {
            console.log(`Error on guild ${guildId}`);
            //console.log(queue.currentTrack);
            //console.log(queue.tracks.toArray());
            //queue.node.skip();
        }
    }

});


(async () => {
    await player.extractors.register(YoutubeiExtractor, {
        streamOptions: { highWaterMark: 1 << 27 },  // large buffer (1 << 27 = 128MB)
        //disablePlayer: true                         // use ANDROID client instead of web player
        generateWithPoToken: true
    });
    //await player.extractors.register(SoundcloudExtractor);

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
    addSoundCloudSongToPlaylist,
    player,
};
