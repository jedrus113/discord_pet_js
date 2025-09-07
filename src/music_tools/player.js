const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    NoSubscriberBehavior
} = require('@discordjs/voice');
const fs = require('fs');

class GuildPlayer {
    constructor() {
        this.connection = null;
        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });
        this.playlist = [];
        this.isPlaying = false;
        this.guildId = null;
        this.disconnectTimeout = null;

        this.player.on(AudioPlayerStatus.Idle, () => {
            this.isPlaying = false;
            if (this.disconnectTimeout) {
                clearTimeout(this.disconnectTimeout);
            }
            if (this.playlist.length > 0) {
                this.playNext();
            } else {
                this.disconnectTimeout = setTimeout(() => {
                if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
                    this.connection.destroy();
                }
                }, 5000); // 5 seconds
            }
        });

        this.player.on('error', error => {
            console.error(`Error in audio player for guild ${this.guildId}:`, error);
            this.isPlaying = false;
            this.playNext();
        });
    }

    playNext() {
        if (this.isPlaying || this.playlist.length === 0) {
            return;
        }

        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }

        this.isPlaying = true;
        const track = this.playlist.shift();
        
        try {
            let resource;
            if (track.type === 'file') {
                if (!fs.existsSync(track.path)) {
                    console.error(`File not found: ${track.path}`);
                    this.isPlaying = false;
                    return this.playNext();
                }
                resource = createAudioResource(track.path);
            } else if (track.type === 'stream') {
                resource = createAudioResource(track.stream);
            } else {
                 console.error(`Unknown track type: ${track.type}`);
                 this.isPlaying = false;
                 return this.playNext();
            }
            
            this.player.play(resource);

        } catch(error) {
            console.error("Error creating audio resource:", error);
            this.isPlaying = false;
            this.playNext();
        }
    }
}

class PlayerManager {
    constructor() {
        this.guilds = new Map();
    }

    /**
     * Retrieves the player node for a specific guild, creating it if it doesn't exist.
     * @param {string} guildId The ID of the guild.
     * @returns {GuildPlayer} The player instance for the guild.
     */
    getNode(guildId) {
        if (!this.guilds.has(guildId)) {
            const newNode = new GuildPlayer();
            newNode.guildId = guildId;
            this.guilds.set(guildId, newNode);
        }
        return this.guilds.get(guildId);
    }

    /**
     * Joins a voice channel and prepares for playback.
     * @param {string} channelId The ID of the voice channel to join.
     * @param {string} guildId The ID of the guild the channel is in.
     * @param {*} adapterCreator The voice adapter from the guild.
     */
    async joinChannel(channelId, guildId, adapterCreator) {
        const node = this.getNode(guildId);

        if (node.connection && node.connection.state.status !== VoiceConnectionStatus.Destroyed) {
            return node.connection;
        }

        const connection = joinVoiceChannel({
            channelId: channelId,
            guildId: guildId,
            adapterCreator: adapterCreator,
        });
        
        connection.on(VoiceConnectionStatus.Destroyed, () => {
            if (node.disconnectTimeout) {
                clearTimeout(node.disconnectTimeout);
            }
            this.guilds.delete(guildId);
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                    connection.destroy();
                }
            }
        });

        node.connection = connection;
        node.connection.subscribe(node.player);
        return connection;
    }

    /**
     * Adds a track to a guild's playlist.
     * @param {string} guildId The ID of the guild.
     * @param {{type: 'file' | 'stream', path?: string, stream?: import('stream').Readable}} track The track to add.
     * @returns {boolean} Whether the track was added successfully.
     */
    addToPlaylist(guildId, track) {
        if (!track || (track.type === 'stream' && !track.stream)) {
            console.error("Invalid track object provided.", track);
            return false;
        }

        const node = this.getNode(guildId);
        node.playlist.push(track);

        if (!node.isPlaying) {
            node.playNext();
        }
        return true;
    }

    /**
     * Stops playback and clears the playlist for a guild.
     * @param {string} guildId The ID of the guild.
     */
    stop(guildId) {
        const node = this.getNode(guildId);
        if (!node) return;

        if (node.disconnectTimeout) {
            clearTimeout(node.disconnectTimeout);
            node.disconnectTimeout = null;
        }

        node.playlist = [];
        node.requestQueue = [];
        node.player.stop(true);

        if (node.connection && node.connection.state.status !== VoiceConnectionStatus.Destroyed) {
            node.connection.destroy();
        } else {
            this.guilds.delete(guildId);
        }
    }
    /**
     * Skips the currently playing song for a guild.
     * @param {string} guildId The ID of the guild.
     * @returns {boolean} True if a song was skipped, otherwise false.
     */
    skip(guildId) {
        const node = this.getNode(guildId);
        if (!node || !node.isPlaying) {
            return false;
        }
        node.player.stop(true);
        return true;
    }
}

module.exports = new PlayerManager();