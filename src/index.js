const client = require('./discord_tools/client');
const { Events } = require('discord.js');
const { log } = require('./utils/logger');
const MyDiscordServersManager = require('./discord_tools/server_class');

// run requirements setup initiation
require('./discord_tools/command')


// bot logged in
client.once(Events.ClientReady, async (readyClient) => {
    log(`✅ Zalogowano jako ${readyClient.user?.tag}`);
    for (const guild of readyClient.guilds.cache.values()) {
        const discordHelper = new MyDiscordServersManager(guild);
        await discordHelper.setupData();
    }

    log(`Startup complete on ${new Date().toISOString()}!`);
});

client.login(process.env.DISCORD_TOKEN);
