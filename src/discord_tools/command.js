const { REST, Routes, Collection, Events, MessageFlags } = require('discord.js');
const fsPromises = require('node:fs').promises;
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const buttonHandlers = require('./commands/utils/buttonHandlers');
const client = require('./client');

dotenv.config();



client.commands = new Collection();

const foldersPath1 = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath1);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath1, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}


client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isChatInputCommand()) {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'Wystąpił błąd przy wykonywaniu komendy!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'Wystąpił błąd przy wykonywaniu komendy!', ephemeral: true });
			}
		}
	}
	else if (interaction.isButton()) {
		const { customId } = interaction;

		try {
			switch (customId) {
				case 'skip':
					await buttonHandlers.handleSkip(interaction);
					break;
				case 'stop':
					await buttonHandlers.handleStop(interaction);
					break;
				case 'pause':
					await buttonHandlers.handlePause(interaction);
					break;
				default:
					await interaction.reply({ content: 'Nieznany przycisk.', ephemeral: true });
			}
		} catch (error) {
			console.error("Błąd obsługi przycisku:", error);
			if (!interaction.replied) {
				await interaction.reply({ content: 'Wystąpił błąd podczas obsługi przycisku.', ephemeral: true });
			}
		}
	}
});


const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);


// and deploy your commands!
(async () => {
	// fetch servers from saved configs
	const commandFolders = await fsPromises.readdir(foldersPath);
	for (const folder of commandFolders) {
		// Grab all the command files from the commands directory you created earlier
		const commandsPath = path.join(foldersPath, folder);
		let commandFiles = (await fsPromises.readdir(commandsPath)).filter(file => file.endsWith('.js'));
		// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				commands.push(command.data.toJSON());
				console.log(`Read command "${command.data.name}"`);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}

	const serversListIds = [];
	const directoryConfPath = path.join(__dirname, '../../data_servers');
	try {
		const entries = await fsPromises.readdir(directoryConfPath, { withFileTypes: true });
		entries.forEach(entry => {
			if (entry.isDirectory() && entry.name !== 'general') {
				serversListIds.push(entry.name);
			}
		});
	} catch (error) {
		console.error("Error while reading server configs");
		console.error(error);
	}
	
	// first clear old commands
	console.log(`Started refreshing ${commands.length} application (/) commands on ${serversListIds.length} servers.`);
	for (const serverId of serversListIds) {
		try {
			// The put method is used to fully refresh all commands in the guild with the current set
			const data = await rest.put(
				await Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, serverId),
				{ body: commands },
			);

			console.log(`Successfully reloaded ${data.length} application (/) commands for server ${serverId}.`);
		} catch (error) {
			// And of course, make sure you catch and log any errors!
			console.error(`Can not reload commands for server ${serverId}.`);
		}
	
	}
})();
