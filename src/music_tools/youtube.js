const play = require('play-dl');


async function findYoutubeUrl(query) {
    console.log(`Wyszukiwanie: ${query}`);
    
    const searchResults = await play.search(query, { limit: 1 });
    if (searchResults.length === 0) {
        console.error("Nie znaleziono utworu na YouTube.");
        return;
    }

    console.log(`Znaleziono: ${searchResults[0].url}`);
    return searchResults[0].url;
}

async function getStream(query) {
    if (await play.yt_validate(query) === 'video') {
        const stream = await play.stream(query);
        
        console.log(stream);
        return stream;
    } else {
        console.log('Invalid YouTube video link.');
    }
}


module.exports = {
    findYoutubeUrl,
    getStream
};