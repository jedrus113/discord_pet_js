const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    NoSubscriberBehavior,
} = require('@discordjs/voice');
const fs = require('fs');

class GuildPlayer {
    constructor() {
        this.connection = null;
        this.player = createAudioPlayer();
        this.playlist = [];
        this.isPlaying = false;
        this.guildId = null;

        this.player.on(AudioPlayerStatus.Idle, () => {
            this.isPlaying = false;
            if (this.playlist.length > 0) {
                this.playNext();
            } else {
                setTimeout(() => {
                    if (!this.isPlaying && this.connection) {
                        this.connection.destroy();
                        this.connection = null;
                    }
                }, 5000);
            }
        });

        this.player.on('error', error => {
            console.error(`Error in audio player for guild ${this.guildId}:`, error);
            this.isPlaying = false;
            if (this.playlist.length > 0) {
                this.playNext();
            }
        });
    }

    playNext() {
        if (this.isPlaying || this.playlist.length === 0) {
            return;
        }

        this.isPlaying = true;
        const track = this.playlist.shift();
        let resource;

        try {
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
            return;
        }

        const connection = joinVoiceChannel({
            channelId: channelId,
            guildId: guildId,
            adapterCreator: adapterCreator,
        });

        // Destroy connection on disconnect to allow for clean reconnects
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Seems to     be reconnecting to a new channel
            } catch (error) {
                // Seems to be a real disconnect which SHOULD be recovered from
                if(connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
            }
        });
        
        connection.on(VoiceConnectionStatus.Destroyed, () => {
            this.guilds.delete(guildId);
        });

        node.connection = connection;
        node.connection.subscribe(node.player); // Link the connection to the player
    }

    /**
     * Adds a track to a guild's playlist.
     * @param {string} guildId The ID of the guild.
     * @param {{type: 'file' | 'stream', path?: string, stream?: import('stream').Readable}} track The track to add.
     * @returns {boolean} Whether the track was added successfully.
     */
    addToPlaylist(guildId, track) {
        if (!track || (track.type === 'file' && !track.path) || (track.type === 'stream' && !track.stream)) {
            console.error("Invalid track object provided.");
            return false;
        }
        const node = this.getNode(guildId);
        node.playlist.push(track);

        // If nothing is playing, start playing now.
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
        node.playlist = [];
        node.player.stop(true); // Stop playback and force the player to enter the Idle state
        if (node.connection) {
            node.connection.destroy();
        }
        this.guilds.delete(guildId);
    }
}

module.exports = new PlayerManager();