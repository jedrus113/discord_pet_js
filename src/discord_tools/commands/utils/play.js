const { SlashCommandBuilder } = require('discord.js');
const { handleSpotifyPlaylist } = require('../../../music_tools/spotify');
const { handleYTRequest } = require('../../../music_tools/youtube');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Odtwórz playlistę ze Spotify lub muzyke z YT')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('URL playlisty Spotify lub Url Filmiku Youtube')
                .setRequired(true)),

	async execute(interaction) {
        const playlistUrl = interaction.options.getString('url');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return await interaction.reply({
                content: 'Dołącz do kanału głosowego i spróbuj ponownie!',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: 'Pracuje nad tym..',
            });
        }

        const isSpotify = playlistUrl.includes('spotify.com/');
        if (isSpotify) {
            console.log('spotify');
            await handleSpotifyPlaylist(playlistUrl, interaction);
        } else {
            console.log('youtube');
            await handleYTRequest(playlistUrl, interaction);
        }
    }
};