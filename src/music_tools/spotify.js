const SpotifyWebApi = require('spotify-web-api-node');
const { handleYTSearchRequest } = require('./youtube');


// load required extractor
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_SECRET,
});


// authenticate to spotify for API access to read playlists
async function authorizeSpotify() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
    } catch (err) {
        console.error('Nie udało się zautoryzować w Spotify:', err);
    }
}


async function handleSpotifyPlaylist(playlistUrl, interaction) {
    await interaction.editReply("Reading playlist...");
    const tracks = await getSpotifyPlaylistTracks(playlistUrl);

    await interaction.editReply({
        content: `Now attempting to find and queue ${tracks.length} tracks from Spotify to play.`
    });

    console.log(`Pobrano ${tracks.length} utworów z playlisty Spotify.`);

    for (const track of tracks) {
        try {
            await handleYTSearchRequest(`${track.name} ${track.artist}`, interaction);
        } catch (err) {
            console.error(`An unexpected error occurred while processing track "${track.name}":`, err.message);
        }
    }

    await interaction.followUp("Finished adding tracks to the queue!");
}


// fetch playlist songs
async function getSpotifyPlaylistTracks(playlist_spotify_url) {
    await authorizeSpotify();

    // Fetch Spotify ID from URL
    const regex = /playlist\/([a-zA-Z0-9]+)/;
    const match = playlist_spotify_url.match(regex);
    if (!match || match.length < 2) {
        throw new Error('Niepoprawny URL playlisty Spotify.');
    }
    const playlistId = match[1];

    let offset = 0;
    let allTracks = [];
    let limit = 100;
    while(true)
    {
        try {
            const data = await spotifyApi.getPlaylistTracks(playlistId, { limit, offset });

            const newList = data.body.items.map(item => ({
                track: item.track,
                name: item.track.name,
                artist: item.track.artists.map(artist => artist.name).join(', '),
                url: item.track.external_urls.spotify // URL do Spotify
            }));
            allTracks.push(...newList);
            if (data.body.items.length < limit) break;
            offset += limit;
        } catch (err) {
            console.error('Nie udało się pobrać utworów z playlisty Spotify:', err);
            throw err;
        }
    }
    return allTracks;
}


module.exports = {
    getSpotifyPlaylistTracks,
    handleSpotifyPlaylist,
};