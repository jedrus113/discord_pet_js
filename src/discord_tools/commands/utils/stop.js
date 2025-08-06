const { SlashCommandBuilder } = require('discord.js');
const { player } = require('../../../music_tools/playlist');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Ucisz szczerbatka'),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            return await interaction.reply('Wejdź na kanał głosowy!1111!');
        }

        const queue = player.nodes.get(interaction.guild);
        
        if (!queue) {
            return await interaction.reply('chyba nie ma kolejki nie rozumiem tego');
        }

        try {
            queue.stop();
            
            await interaction.reply('muzyczka zatrzymana ');
        } catch (error) {
            await interaction.reply('idk jak tu sie handluje errory' + error);
        }
    },
}; 
