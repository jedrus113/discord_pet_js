const { SlashCommandBuilder } = require('discord.js');
const { player } = require('../../../music_tools/playlist');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Ucisz szczerbatka'),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            return await interaction.reply('Nie jestem na kanale głosowym');
        }

        const queue = player.nodes.get(interaction.guild);
        
        if (!queue) {
            return await interaction.reply('Jakiś problem z kolejką, nie ma.');
        }

        try {
            queue.delete();
            
            await interaction.reply('Agoxu własnoręcznie zatrzymał muzykę.');
        } catch (error) {
            await interaction.reply('Error: ' + error);
        }
    },
}; 
