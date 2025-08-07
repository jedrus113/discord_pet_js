const SoundCloud = require('soundcloud-scraper');
const client = new SoundCloud.Client(process.env.SOUNDCLOUD_CLIENT_ID);

async function findSoundCloudUrl(query) {
    console.log(`Wyszukiwanie: ${query} w SoundCloud`);

    try {
        const results = await client.search(query, 'track', 1);
        if (!results.length) {
            console.error("Nie znaleziono utworu na SoundCloud.");
            return null;
        }

        const track = results[0];
        console.log(`Znaleziono Utwór: ${track.url}`);
        return track.url;
    } catch (error) {
        console.error("Error z wyszukiwaniem:", error);
        return null;
    }
}

module.exports = {
    findSoundCloudUrl,
};
