const { REST, Routes } = require('discord.js');
const fsPromises = require('node:fs').promises;

const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config();

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
	const directoryConfPath = path.join(__dirname, '../../conf');
	const files = await fsPromises.readdir(directoryConfPath) 
	// Filtruj pliki z rozszerzeniem .json i usuń końcówkę
	files.forEach(file => {
		if (path.extname(file) === '.json') {
			const fileNameWithoutExtension = path.basename(file, '.json');
			serversListIds.push(fileNameWithoutExtension);
		}
	});
	
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
