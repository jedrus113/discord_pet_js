const { SlashCommandBuilder } = require('discord.js');
const { getSpotifyPlaylistTracks } = require('../../../music_tools/spotify');
const { addSongToPlaylist, makeQueThenJoin } = require('../../../music_tools/playlist');



module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Odtwórz playlistę ze Spotify')
        .addStringOption(option => 
            option.setName('playlist_url')
                .setDescription('URL playlisty Spotify')
                .setRequired(true)),

	async execute(interaction) {
        const playlistUrl = interaction.options.getString('playlist_url');
        const tracks = await getSpotifyPlaylistTracks(playlistUrl);
        const voiceChannel = interaction.member.voice.channel;
        const reply_message = await interaction.reply(`Spróbuję to odtworzyć na kanale <#${voiceChannel.id}>, muszę znaleźć ${tracks.length} kawałków z playlisty ${playlistUrl}`);
        
        console.log(`Pobrano ${tracks.length} utworów z playlisty Spotify.`);

        const queue = await makeQueThenJoin(interaction.guild, voiceChannel)

        // play song / or add to queue
        for (let track of tracks) {
            await addSongToPlaylist(queue, track.name, track.artist);
        }
        await interaction.followUp("Nie ręczę za efekty, ale coś się udało znaleźć...")
    },
};
