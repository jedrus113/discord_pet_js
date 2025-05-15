const client = require('./discord_tools/client');
const MyDiscordHelperPerServer = require('./discord_tools/server_class');
const { Events, ChannelType } = require('discord.js');
const { openAiChat, getAiResponse } = require('./ai_tools/chatbot');

// bot logged in
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ Zalogowano jako ${readyClient.user?.tag}`);

    for (const guild of readyClient.guilds.cache.values()) {
        const discordHelper = new MyDiscordHelperPerServer(guild);
        await discordHelper.setupData();
    }
    console.log("Startup complete!");
});

// user joins server
client.on(Events.GuildMemberAdd, async (member) => {
    console.log(`New user ${member.user.username} in ${member.guild.name}`);
    MyDiscordHelperPerServer.get(member.guild.id).sendWelcomeMessage(member.user);
});

// user leaves server
client.on(Events.GuildMemberRemove, async (member) => {
    console.log(`User ${member.user.username} quit ${member.guild.name}`);
    MyDiscordHelperPerServer.get(member.guild.id).sendFarewellMessage(member.user);
});


// message sent to server
client.on(Events.MessageCreate, async (message) => {
  if (message.author.id == client.user?.id) return;

  
  if (message.author.id == "716390085896962058" && message.embeds.length > 0) {
    const embeded = message.embeds[0];
    const eTitle = embeded.title;
    const imgUrl = embeded.image?.url; // Pobierz URL obrazu
    
    if (!eTitle || !imgUrl || (!eTitle.startsWith("A wild") && !eTitle.startsWith("Wild"))) {
      return;
    }

    const prompt = `opisz w 4-10 wyrazach zwierzę i wymyśl mu zabawną nazwę. Przykład: "Zapakowany jeżowcowy kudłacz - To Zębaty Ziemniak."`
    const responseText = await getAiResponse(prompt, [], [imgUrl], "");

    await message.reply(responseText, { mentionAuthor: false });
  }

  const actionHanlder = MyDiscordHelperPerServer.get(message.guild?.id);
  if (await actionHanlder?.protectChannel(message)) return;

  if (message.author.bot) return;

  const isPrivate = message.channel?.type === ChannelType.DM;
  const isBotMentioned = message.mentions?.users.has(client.user.id);

  if (!isPrivate && !isBotMentioned) return;

  console.log(`Message may be important!\npriv: ${isPrivate}\nisBotMentioned: ${isBotMentioned}`);

  const messageLengthLvl = await actionHanlder?.getChannelResposeLvl(message.channel.id) || 2;
  const knowlageBase = await actionHanlder?.getChannelKnowlageBase();
  const messages = await message.channel.messages.fetch({ limit: 100 });

  const reply = await openAiChat(message, messages, messageLengthLvl, knowlageBase);

  for (let i = 0; i < reply.length; i += 1900) {
    message.reply(reply.slice(i, i + 2000));
  }
});

client.login(process.env.DISCORD_TOKEN);
