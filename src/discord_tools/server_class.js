const fs = require('fs').promises;
const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const client = require('./client');
const GuildPlayer = require('../music_tools/player');


class MyDiscordServersManager {
    static instances = {}; // objs per server

    constructor(guild) {
        this.server = guild;
        // create conf dir if not exists
        this.baseDataPath = path.resolve(`data_servers/${this.server.id}`);
        this.serverConfigFilePath = path.join(`data_servers/${this.server.id}`, 'config.json');
        MyDiscordServersManager.instances[this.server.id] = this;

        this.player = new GuildPlayer(this);
        
        this.saveableConfig = undefined;

        this.designatedMusicTextChannel = null;

        this.connection = null;
    }

    async setupData() {
        console.log(`Setting up for ${this.server.name}`);
        try {
            await fs.mkdir(this.baseDataPath, { recursive: true });
            await fs.access(this.serverConfigFilePath);
            const data = await fs.readFile(this.serverConfigFilePath, 'utf-8');
            this.saveableConfig = JSON.parse(data);
            
            try {
                if (this.saveableConfig.designatedMusicTextChannelId) {
                    this.designatedMusicTextChannel = await this.server.channels.fetch(this.saveableConfig.designatedMusicTextChannelId);
                }
            } catch (error) {
                console.error("designatedMusicTextChannelId ERROR!");
                console.error(error);
            }
            
        } catch (error) {
            console.error("ERROR!");
            console.error(error);
            
            this.saveableConfig = { "server_name": this.server.name, "conf_created": new Date().toLocaleString() };
            const dirPath = path.dirname(this.serverConfigFilePath);
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(this.serverConfigFilePath, JSON.stringify(this.saveableConfig, null, 4));
        }

    }

    static get(guild_id) {
        return MyDiscordServersManager.instances[guild_id];
    }

    async addToPlaylist(stream) {
        return await this.player.addToPlaylist(stream);
    }

    async skipPlaylistSong() {
        return await this.player.playNext();
    }

    async stopPlaylist() {
        return await this.player.stop();
    }

}

module.exports = MyDiscordServersManager;