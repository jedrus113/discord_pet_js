const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, VoiceChannel } = require('discord.js');
const { getSpotifyPlaylistTracks } = require('../../../music_tools/spotify');
const { getStream, findYoutubeUrl } = require('../../../music_tools/youtube')
const player = require('../../../music_tools/player')

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
        await player.joinChannel(VoiceChannel, interaction.guild.id, interaction.guild.voiceAdapterCreator);

        const reply_message = await interaction.reply("Starging spotify");
        const tracks = await getSpotifyPlaylistTracks(playlistUrl);
        await interaction.editReply({
            content: `Spróbuję to odtworzyć na kanale <#${voiceChannel.id}>, muszę znaleźć ${tracks.length} kawałków z playlisty ${playlistUrl}`
        });
        
        console.log(`Pobrano ${tracks.length} utworów z playlisty Spotify.`);


        for (let track of tracks) {
            try {
                let url = await findYoutubeUrl(`${track.name} ${track.artist}`);
                let stream = await getStream(url);

                player.addToPlaylist(interaction.guild.id, stream);
                
            } catch (err) {
                console.warn("ERROR SPOTTETD! \n\n\n\n\n ERROR SPOSTETS \n\n", err.message )
            }
        }
        await interaction.followUp("Nie ręczę za efekty, ale coś się udało znaleźć...")
    },
};