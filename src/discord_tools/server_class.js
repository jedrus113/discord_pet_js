const fs = require('fs').promises;
const path = require('path');
const { EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ContainerBuilder,
    MessageFlags, StringSelectMenuBuilder, ModalBuilder, TextInputStyle, TextInputBuilder } = require('discord.js');
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
        this.nowPlaingMessage = null;
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

    async toggleRandomPlaylFromPlaylist(state) {
        this.player.isRandomPlaylistEnabled = state;
        await this.sendOrUpdateNowPlaingMessage();
    }


    async sendOrUpdateNowPlaingMessage() {
        const songData = this.player.player.state.resource.metadata;

        const title = songData.title;
        const description = songData.ytData.description
        const thumbUrl = songData.ytData.thumbnail;
        const length = songData.ytData.timestamp;
        const videoUrl = songData.url;
        let rangomOptionBttn;

        if (this.player.isRandomPlaylistEnabled) {
            rangomOptionBttn = new ButtonBuilder().setCustomId('disableRandomPlaylist').setLabel('Click for set order').setStyle(ButtonStyle.Success);
        } else {
            rangomOptionBttn = new ButtonBuilder().setCustomId('enableRandomPlaylist').setLabel('Click for random order').setStyle(ButtonStyle.Secondary);
        }

        const exampleContainer = new ContainerBuilder()
            .setAccentColor(0xFFFFFF)
            // for now i am disabling list selector
            //.addTextDisplayComponents(
            //    textDisplay => textDisplay
            //        .setContent('This text is inside a Text Display component! You can use **any __markdown__** available inside this component too.'),
            //)
            //.addActionRowComponents(
            //    actionRow => actionRow
            //        .setComponents(
            //            new StringSelectMenuBuilder({
            //                custom_id: 'a cool select menu',
            //                placeholder: 'Select recent playlist to play',
            //                //max_values: 2,
            //                options: [
            //                    { label: 'playlist 1', value: '1' },
            //                    { label: 'playlist 2', value: '2' },
            //                    { label: 'playlist 3', value: '3' },
            //                ],
            //            }),
            //        ),
            //)
            //.addSeparatorComponents(
            //    separator => separator,
            //)
            .addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent('# ' + title),
                        textDisplay => textDisplay
                            .setContent(description),
                        textDisplay => textDisplay
                            .setContent(length),
                    )
                    .setThumbnailAccessory(
                        tumb => tumb
                            .setDescription("Video thumbnail")
                            .setURL(thumbUrl)
                    ),
            )
            .addActionRowComponents(
                actionRow => actionRow
                    .setComponents(
                        //new ButtonBuilder().setCustomId('test_Secondary').setLabel('test_Secondary').setStyle(ButtonStyle.Secondary),
                        //new ButtonBuilder().setCustomId('test_Success').setLabel('test_Success').setStyle(ButtonStyle.Success),
                        rangomOptionBttn,
                        new ButtonBuilder().setCustomId('skipSongPlaylist').setLabel('Skip Song').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('stopAndRemoveList').setLabel('Stop').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setLabel('Video YouTube').setStyle(ButtonStyle.Link).setURL(videoUrl),
                    ),
            );
        try {
            await this.nowPlaingMessage.edit({
                embeds: [],
                components: [exampleContainer],
                flags: MessageFlags.IsComponentsV2,
            })
        } catch (error) {
            this.nowPlaingMessage = await this.designatedMusicTextChannel.send(
                { embeds: [], components: [exampleContainer], flags: MessageFlags.IsComponentsV2, }
            );
        }
    }

}


client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isSelectMenu()) return;

    if (interaction.isButton()) {
        if (interaction.customId === "stopAndRemoveList") {
            await MyDiscordServersManager.get(interaction.guildId).stopPlaylist()
            interaction.deferUpdate()
        }
        else if (interaction.customId === "skipSongPlaylist") {
            await MyDiscordServersManager.get(interaction.guildId).skipPlaylistSong()
            interaction.deferUpdate()
        }
        else if (interaction.customId === "enableRandomPlaylist") {
            await MyDiscordServersManager.get(interaction.guildId).toggleRandomPlaylFromPlaylist(true);
            interaction.deferUpdate()
        }
        else if (interaction.customId === "disableRandomPlaylist") {
            await MyDiscordServersManager.get(interaction.guildId).toggleRandomPlaylFromPlaylist(false);
            interaction.deferUpdate()
        }


        if (interaction.customId.startsWith('test_')) {
            // Reakcja na wciśnięcie przycisku
            //await interaction.reply({ content: 'Przycisk został wciśnięty!', ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId('myModal')
                .setTitle('My Modal');

            // Add components to modal

            // Create the text input components
            const favoriteColorInput = new TextInputBuilder()
                .setCustomId('favoriteColorInput')
                // The label is the prompt the user sees for this input
                .setLabel("What's your favorite color?")
                // Short means only a single line of text
                .setStyle(TextInputStyle.Short);

            const hobbiesInput = new TextInputBuilder()
                .setCustomId('hobbiesInput')
                .setLabel("What's some of your favorite hobbies?")
                // Paragraph means multiple lines of text.
                .setStyle(TextInputStyle.Paragraph);

            // An action row only holds one text input,
            // so you need one action row per text input.
            const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
            const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);

            // Add inputs to the modal
            modal.addComponents(firstActionRow, secondActionRow);

            // Show the modal to the user
            await interaction.showModal(modal);
        }
    }

    if (interaction.isSelectMenu()) {
        if (interaction.customId === 'a cool select menu') {
            // Reakcja na wybranie opcji z menu
            const selectedValue = interaction.values[0];
            await interaction.reply({ content: `Wybrałeś playlistę: ${selectedValue}`, ephemeral: true });
        }
    }
});

module.exports = MyDiscordServersManager;