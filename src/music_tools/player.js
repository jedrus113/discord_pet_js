const {
    joinVoiceChannel,
    createAudioPlayer,
    getVoiceConnection,
    createAudioResource,
    AudioPlayerStatus,
    AudioPlayerIdleState,
    NoSubscriberBehavior,
    VoiceConnectionDestroyedState,
} = require('@discordjs/voice');
const fs = require('fs');

class GuildPlayer {
    constructor(guildManager) {
        this.guildManager = guildManager;
        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });
        this.playlist = [];
        this.isRandomPlaylistEnabled = false;

        this.player.on(AudioPlayerStatus.Idle, async () => {
            await this.playNext();
        });

        this.player.on('error', async error => {
            console.error(`Error in audio player for guild ${this.guildId}:`, error);
            await this.playNext();
        });
    }

    async joinChannel(channelId) {
        this.connection = joinVoiceChannel({
            channelId: channelId,
            guildId: this.guildManager.server.id,
            adapterCreator: this.guildManager.server.voiceAdapterCreator,
        });

        this.connection.subscribe(this.player);
    }

    async addToPlaylist(stream) {
        this.playlist.push(stream);
        if (getVoiceConnection(this.guildManager.server.id) && getVoiceConnection(this.guildManager.server.id)?.state !== VoiceConnectionDestroyedState) {
            if (this.player.state === AudioPlayerIdleState) await this.playNext();
            return;  // so it is playing currenly
        }
        await this.joinChannel(stream.interaction.member.voice.channel.id);
        await this.playNext();
    }

    async playNext() {
        let track;
        if (this.isRandomPlaylistEnabled) {
            const index = Math.floor(Math.random() * this.playlist.length);
            track = this.playlist.splice(index, 1)[0];
        } else {
            track = this.playlist.shift();
        }
        if (!track) {
            await this.stop();
            return;
        }

        let resource;
        if (track.type === 'file') {
            if (!fs.existsSync(track.path)) {
                console.error(`File not found: ${track.path}`);
                return await this.playNext();
            }
            resource = createAudioResource(track.path);
        } else if (track.type === 'stream') {
            resource = createAudioResource(track.stream);
        }
        resource.metadata = track;

        this.player.play(resource);

        await this.guildManager.sendOrUpdateNowPlaingMessage();
    }

    async stop() {
        this.playlist = [];
        getVoiceConnection(this.guildManager.server.id)?.disconnect();
    }
}

module.exports = GuildPlayer;
