const { REST, Routes, Collection, Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const client = require('./client');
const { log } = require("../utils/logger");

dotenv.config();

// ----------------- Load Commands -----------------
client.commands = new Collection();

const commands = [];
const folderPath = path.join(__dirname, 'commands/utils');
const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        log(`Loaded command "${command.data.name}"`);
    } else {
        log(`[WARNING] Command at ${filePath} is missing "data" or "execute".`);
    }
}

// ----------------- Handle Interactions -----------------
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    log(`Execute command: ${command?.data?.name}`);

    if (!command) {
        log(`No command matching ${interaction.commandName} found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        log(`Command Error: ${error.message}\n${error.stack}`);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Wystąpił błąd przy wykonywaniu komendy!' });
        } else {
            await interaction.reply({ content: 'Wystąpił błąd przy wykonywaniu komendy!' });
        }
    }
});

// ----------------- Deploy Commands -----------------
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

client.once('clientReady', async () => {
    try {
        const serverIds = client.guilds.cache.map(guild => guild.id);
        log(`Deploying ${commands.length} commands to ${serverIds.length} servers...`);

        // Deploy commands to each server
        await Promise.all(serverIds.map(async (serverId) => {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, serverId),
                    { body: commands }
                );
            } catch (error) {
                console.error(`Failed to deploy commands to server ${serverId}:`, error);
                log(`Failed to deploy commands to server ${serverId}: ${error}`);
            }
        }));

        log('Command deployment complete!');
    } catch (error) {
        console.error('Error deploying commands:', error);
        log(`Failed to deploy commands to server ${serverId}: ${error}`);
    }
});
