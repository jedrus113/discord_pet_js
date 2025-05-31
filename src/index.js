const client = require('./discord_tools/client');
const MyDiscordHelperPerServer = require('./discord_tools/server_class');
const { Events, ChannelType } = require('discord.js');
const { openAiChat } = require('./ai_tools/chatbot');
const { log } = require('./utils/logger');

// bot logged in
client.once(Events.ClientReady, async (readyClient) => {
    log(`✅ Zalogowano jako ${readyClient.user?.tag}`);

    for (const guild of readyClient.guilds.cache.values()) {
        const discordHelper = new MyDiscordHelperPerServer(guild);
        await discordHelper.setupData();
    }
    log(`Startup complete on ${new Date().toISOString()}!`);
});

// user joins server
client.on(Events.GuildMemberAdd, async (member) => {
    log(`New user ${member.user.username} in ${member.guild.name}`);
    MyDiscordHelperPerServer.get(member.guild.id).sendWelcomeMessage(member.user);
});

// user leaves server
client.on(Events.GuildMemberRemove, async (member) => {
    log(`User ${member.user.username} quit ${member.guild.name}`);
    MyDiscordHelperPerServer.get(member.guild.id).sendFarewellMessage(member.user);
});


// message sent to server
client.on(Events.MessageCreate, async (message) => {
  if (message.author.id == client.user?.id) return;

  // protect channels as defined in server class, possibly from bots
  const actionHanlder = MyDiscordHelperPerServer.get(message.guild?.id);
  if (await actionHanlder?.protectChannel(message)) return;

  // skip bots messages
  if (message.author.bot) return;

  // respond to bot mentions or private messages ONLY
  const isPrivate = message.channel?.type === ChannelType.DM;
  const isBotMentioned = message.mentions?.users.has(client.user.id);

  if (!isPrivate && !isBotMentioned) return;

  log(`Mesasge in ${message.channel.name} by ${message.author.username} content:\n${message.content}\n`);

  const knowlageBase = await actionHanlder?.getChannelKnowlageBase();
  const messages = await message.channel.messages.fetch({ limit: 100 });

  const messageLengthLvl = await actionHanlder?.getChannelResposeLvl(message.channel.id) || 2;
  let channelPrompt = `Id kanału: ${message.channel.id}\nNazwa kanału: ${message.channel.name}`
  if (messageLengthLvl == 1) {
    channelPrompt += "\nTwoje zasady odpowiadania: Jest to kanał na którym nie wolno Ci spamować. Twoje odpowiedzi muszą być krótkie tj. jedno krótkie zdanie sporadycznie bardzo żadko ciut więcej."
  } else if (messageLengthLvl == 3) {
    channelPrompt += "\nTwoje zasady odpowiadania: Jest to kanał na którym zamierzasz odpisać zgodnie z oczekiwaniami rozmowy, jak tylko umiesz ze wszsytkim i w pełni."
  }
  const reply = await openAiChat(message, messages, channelPrompt, knowlageBase);
  log(`Reply:\n${reply}\n`);
  for (let i = 0; i < reply.length; i += 1900) {
    message.reply(reply.slice(i, i + 2000));
  }
});

client.login(process.env.DISCORD_TOKEN);
