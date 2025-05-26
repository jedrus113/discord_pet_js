const play = require('play-dl');


async function findYoutubeUrl(query) {
    console.log(`Wyszukiwanie: ${query}`);


    const searchResults = await play.search(query, { limit: 1 });
    if (searchResults.length === 0) {
        console.error("Nie znaleziono utworu na YouTube.");
        return;
    }

    return searchResults[0].url;
}


module.exports = {
    findYoutubeUrl,
};
