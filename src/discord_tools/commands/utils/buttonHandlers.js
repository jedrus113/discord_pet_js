const { player } = require('../../../music_tools/playlist');

async function safeReply(interaction, content) {
	try {
		if (interaction.replied || interaction.deferred) {
			return await interaction.followUp({ content, ephemeral: true });
		} else {
			return await interaction.reply({ content, ephemeral: true });
		}
	} catch (error) {
		console.error("Błąd w safeReply:", error);
	}
}

async function handleSkip(interaction) {
	const queue = player.nodes.get(interaction.guild);

	if (!queue) {
		return safeReply(interaction, 'Nie znaleziono kolejki muzyki.');
	}

	try {
		queue.node.skip();
		return safeReply(interaction, 'Pominięto piosenkę.');
	} catch (error) {
		return safeReply(interaction, `Błąd podczas pomijania piosenki: ${error.message}`);
	}
}

async function handleStop(interaction) {
	const queue = player.nodes.get(interaction.guild);

	if (!queue) {
		return safeReply(interaction, 'Obecnie nie jest odtwarzana żadna muzyka.');
	}

	try {
		queue.delete();
		return safeReply(interaction, 'Zatrzymano muzykę i wyczyszczono kolejkę.');
	} catch (error) {
		return safeReply(interaction, `Błąd podczas zatrzymywania muzyki: ${error.message}`);
	}
}

async function handlePause(interaction) {
	const queue = player.nodes.get(interaction.guild);

	if (!queue) {
		return safeReply(interaction, 'Obecnie nie jest odtwarzana żadna muzyka.');
	}

	try {
		if (queue.node.isPaused()) {
			queue.node.resume();
			return safeReply(interaction, 'Wznowiono muzykę.');
		} else {
			queue.node.pause();
			return safeReply(interaction, 'Wstrzymano muzykę.');
		}
	} catch (error) {
		return safeReply(interaction, `Błąd podczas pauzowania/wznawiania: ${error.message}`);
	}
}

module.exports = {
	handleSkip,
	handleStop,
	handlePause
};
