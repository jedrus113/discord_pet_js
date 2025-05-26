const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

const SpotifyWebApi = require('spotify-web-api-node');
const play = require('play-dl');


const spotifyApi = new SpotifyWebApi({
    clientId: '',
    clientSecret: '',
});

// Funkcja autoryzująca, aby uzyskać dostęp do API Spotify
async function authorizeSpotify() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
    } catch (err) {
        console.error('Nie udało się zautoryzować w Spotify:', err);
    }
}

// Funkcja pobierająca utwory z playlisty Spotify
async function getSpotifyPlaylistTracks(playlist_spotify_url) {
    await authorizeSpotify();

    // Pobieranie Spotify ID z URL
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

async function playFromSpotifyPlaylist(connection, playlist_spotify_url) {
    const tracks = await getSpotifyPlaylistTracks(playlist_spotify_url);
    console.log(`Pobrano ${tracks.length} utworów z playlisty Spotify.`);
    await playFromSpotifyData(connection, tracks[0].name, tracks[0].artist);
}

async function playFromSpotifyData(connection, title, artist) {
    const query = `${title} ${artist}`;
    console.log(`Wyszukiwanie: ${query}`);
  
    try {
      const searchResults = await play.search(query, { limit: 1 });
      if (searchResults.length === 0) {
        console.error("Nie znaleziono utworu na YouTube.");
        return;
      }
      console.log(`znaleziono (${searchResults.length})): ${searchResults}`);
  
      console.log(`Gram: ${searchResults[0]}`);
      const video = searchResults[0];
      console.log(`play video.url: ${video.url}`);
      const stream = await play.stream(video.url);
      console.log(`createAudioResource: ${stream.type}`);
      const resource = createAudioResource(stream.stream, { inputType: stream.type });
      console.log(`resource created: ${resource}`);

      const player = createAudioPlayer();
      connection.subscribe(player);
      player.play(resource);
  
      player.on(AudioPlayerStatus.Playing, () => {
        console.log(`Odtwarzanie: ${video.title}`);
      });
  
      player.on('error', error => {
        console.error(`Błąd odtwarzania: ${error.message}`);
      });
  
    } catch (error) {
      console.error(error);
      console.error("Wystąpił błąd podczas odtwarzania utworu.");
    }
}


module.exports = {
    playFromSpotifyPlaylist,
    getSpotifyPlaylistTracks,
    playFromSpotifyData
};
