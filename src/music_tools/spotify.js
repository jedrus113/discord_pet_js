const SpotifyWebApi = require('spotify-web-api-node');


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

    try {
        const data = await spotifyApi.getPlaylistTracks(playlistId);
        return data.body.items.map(item => ({
            track: item.track,
            name: item.track.name,
            artist: item.track.artists.map(artist => artist.name).join(', '),
            url: item.track.external_urls.spotify // URL do Spotify
        }));
    } catch (err) {
        console.error('Nie udało się pobrać utworów z playlisty Spotify:', err);
        throw err;
    }
}


module.exports = {
    getSpotifyPlaylistTracks,
};
