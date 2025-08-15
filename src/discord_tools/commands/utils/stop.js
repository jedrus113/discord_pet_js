const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, VoiceChannel } = require('discord.js');
const player = require('../../../music_tools/player')


module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Ucisz szczerbatka'),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            return await interaction.reply('Nie jestem na kanale głosowym');
        }

        player.stop(interaction.guild.id);

    },
}; 