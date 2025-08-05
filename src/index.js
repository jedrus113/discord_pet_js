const client = require('./discord_tools/client');
const { Events } = require('discord.js');
const { log } = require('./utils/logger');

// run requirements setup initiation
require('./discord_tools/command')
require('./music_tools/playlist')


// bot logged in
client.once(Events.ClientReady, async (readyClient) => {
    log(`✅ Zalogowano jako ${readyClient.user?.tag}`);

    log(`Startup complete on ${new Date().toISOString()}!`);
});

client.login(process.env.DISCORD_TOKEN);
