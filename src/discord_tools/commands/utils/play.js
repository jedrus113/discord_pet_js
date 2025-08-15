const { SlashCommandBuilder } = require('discord.js');
const { getSpotifyPlaylistTracks } = require('../../../music_tools/spotify');
const { getStream, findYoutubeUrl, isYoutubeUrl } = require('../../../music_tools/youtube');
const player = require('../../../music_tools/player');

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
            return interaction.reply({ 
                content: 'You must be in a voice channel to use this command!',
                ephemeral: true 
            });
        }

        try {
            await player.joinChannel(voiceChannel.id, interaction.guild.id, interaction.guild.voiceAdapterCreator);
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'Could not join the voice channel.', ephemeral: true });
        }
        
        if (isYoutubeUrl(playlistUrl)) {
            await interaction.reply(`Playing YouTube link in <#${voiceChannel.id}>...`);
            try {
                const streamData = await getStream(playlistUrl);
                if (!streamData) {
                    return interaction.editReply("Could not get a stream from the YouTube link.");
                }
                player.addToPlaylist(interaction.guild.id, streamData);
                return interaction.followUp("Added YouTube track to the queue!");
            } catch (err) {
                console.error(err);
                return interaction.editReply("An error occurred while trying to play the YouTube link.");
            }
        }
        
        await interaction.reply("Reading playlist...");
        const tracks = await getSpotifyPlaylistTracks(playlistUrl);

        if (!tracks || tracks.length === 0) {
            return interaction.editReply({ content: `Could not find any tracks for the playlist: ${playlistUrl}` });
        }
        
        await interaction.editReply({
            content: `Now attempting to find and queue ${tracks.length} tracks from Spotify on channel <#${voiceChannel.id}>.`
        });
        
        console.log(`Pobrano ${tracks.length} utworów z playlisty Spotify.`);

        for (const track of tracks) {
            try {
                const video = await findYoutubeUrl(`${track.name} ${track.artist}`);
                if (!video) {
                    console.warn(`Could not find a YouTube video for: ${track.name} - ${track.artist}`);
                    continue; // Skip to the next track
                }

                const streamData = await getStream(video);
                if (!streamData) {
                    console.warn(`Could not get a stream for: ${video.url}`);
                    continue; // Skip to the next track
                }

                player.addToPlaylist(interaction.guild.id, streamData);
                
            } catch (err) {
                console.error(`An unexpected error occurred while processing track "${track.name}":`, err.message);
            }
        }

        await interaction.followUp("Finished adding tracks to the queue!");
    },
};