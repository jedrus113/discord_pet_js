const { SlashCommandBuilder } = require('discord.js');
const { player } = require('../../../music_tools/playlist');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skipnij utwór'),

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
            queue.node.skip();
            
            await interaction.reply('Skip..');
        } catch (error) {
            await interaction.reply('Error: ' + error);
        }
    },
}; 
