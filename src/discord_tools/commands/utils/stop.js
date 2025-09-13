const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, VoiceChannel } = require('discord.js');
const player = require('../../../music_tools/player')
const MyDiscordServersManager = require("../../server_class");


module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Zatrzymaj Muzyke.'),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            return await interaction.reply('Nie jestem na kanale głosowym');
        }

        const guildManager = MyDiscordServersManager.get(interaction.guild.id);
        await guildManager.stopPlaylist();

        await interaction.reply('Stopped')
    },
}; 