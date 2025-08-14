const { SlashCommandBuilder } = require('discord.js');
const player = require('../../../music_tools/player.js')
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Ucisz szczerbatka'),

    async execute(interaction) {   
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return await interaction.reply('Musisz być w kanałe głosowym1');
        }
        
        await player.joinChannel(voiceChannel.id, interaction.guild.id, interaction.guild.voiceAdapterCreator);

        const filePath = path.join(__dirname, 'fire.mp3'); 
        const track = {
            type: 'file',
            path: filePath
        };

        try {
            const added = player.addToPlaylist(interaction.guild.id, track);
        } catch (error) {
            await interaction.reply('Error: ' + error);
        }
    },
}; 