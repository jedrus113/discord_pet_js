const { SlashCommandBuilder } = require('discord.js');
const { getSpotifyPlaylistTracks } = require('../../../music_tools/spotify');
const { addSongToPlaylist, addYTSongToPlaylist, makeQueThenJoin, addYTPlaylist } = require('../../../music_tools/playlist');


function detectUrlType(url) {
    if (url.includes('spotify.com')) {
        return 'spotify';
    } else if ((url.includes('youtube.com') && url.includes('list=')) || (url.includes('youtu.be') && url.includes('list='))) {
        return 'youtube_playlist';
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'youtube';
    } else {
        return 'unknown';
    }
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Odtwórz playlistę ze Spotify lub muzyke z YT')
        .addStringOption(option => 
            option.setName('playlist_url')
                .setDescription('URL playlisty Spotify')
                .setRequired(true)),

	async execute(interaction) {
        const playlistUrl = interaction.options.getString('playlist_url');
        const voiceChannel = interaction.member.voice.channel;
        const queue = await makeQueThenJoin(interaction.guild, voiceChannel)

        if (detectUrlType(playlistUrl) == "youtube") {
            try {
                await addYTSongToPlaylist(queue, playlistUrl);
            } catch (err) {
                console.warn("ERROR SPOTTETD2! \n\n\n\n\n ERROR SPOSTETS2 \n\n", err.message )
            }
            const reply_message = await interaction.reply(`Spróbuję to odtworzyć na kanale <#${voiceChannel.id}>, muszę znaleźć ${playlistUrl}`);
            return
        }

        if (detectUrlType(playlistUrl) == "youtube_playlist") {
            await interaction.reply(`Dodaję utwory z playlisty YT ${playlistUrl} na kanał <#${voiceChannel.id}>`);
            try {
                await addYTPlaylist(queue, playlistUrl);
            } catch (err) {
                console.warn("Błąd przy odtwarzaniu playlisty YT:", err.message);
                await interaction.followUp("Nie udało się odtworzyć playlisty z YouTube.");
            }
            return;
        }

        const tracks = await getSpotifyPlaylistTracks(playlistUrl);
        const reply_message = await interaction.reply(`Spróbuję to odtworzyć na kanale <#${voiceChannel.id}>, muszę znaleźć ${tracks.length} kawałków z playlisty ${playlistUrl}`);
        
        console.log(`Pobrano ${tracks.length} utworów z playlisty Spotify.`);


        // play song / or add to queue
        for (let track of tracks) {
            try {
                await addSongToPlaylist(queue, track.name, track.artist);
            } catch (err) {
                console.warn("ERROR SPOTTETD! \n\n\n\n\n ERROR SPOSTETS \n\n", err.message )
            }
        }
        await interaction.followUp("Nie ręczę za efekty, ale coś się udało znaleźć...")
    },
};
