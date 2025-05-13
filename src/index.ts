import client from './discord_tools/client';
import { Events, ChannelType, GuildMember, PartialGuildMember, Message, Collection } from 'discord.js';

import MyDiscordHelperPerServer from './discord_tools/server_class';

import { openAiChat } from './ai_tools/chatbot'




// bot logged in
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ Zalogowano jako ${readyClient.user?.tag}`);

    for (const guild of readyClient.guilds.cache.values()) {
      const discordHelper = new MyDiscordHelperPerServer(guild);
      await discordHelper.setupData();      
    }
    console.log("Startup complete!");
});


// user join to server
client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
  console.log(`New user ${member.user.username} in ${member.guild.name}`);
  MyDiscordHelperPerServer.get(member.guild.id).send_welcome_message(member.user);
});


// user left server
client.on(Events.GuildMemberRemove, async (member: GuildMember | PartialGuildMember) => {
  console.log(`User ${member.user.username} quit ${member.guild.name}`);
  MyDiscordHelperPerServer.get(member.guild.id).send_farawel_message(member.user);
});


// message sent to server
client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.id == client.user?.id) return;
  
  const actionHanlder: MyDiscordHelperPerServer | undefined = MyDiscordHelperPerServer.get(message.guild?.id as string);
  if (await actionHanlder?.protectChannel(message)) return;

  if (message.author.bot) {
    //bot so skip, or handle differently

    return
  }

  const isPrivate = message.channel.type === ChannelType.DM;
  const isBotMentioned = message.mentions.users.has(client.user!.id);

  if (!isPrivate && !isBotMentioned) return;
  
  // message DM albo mentioned
  console.log(`Message may be important!\npriv: ${isPrivate}\nisBotMentioned: ${isBotMentioned}`);

  const messageLengthLvl: Number = await actionHanlder?.getChannelResposeLvl(message.channel.id) || 2;
  const messages: Collection<string, Message<boolean>> = await message.channel.messages.fetch({ limit: 100 });
  
  const reply: string = await openAiChat(message, messages, messageLengthLvl);

  for (let i = 0; i < reply.length; i += 1900) {
    message.reply(reply.slice(i, i + 2000));
  }


});

client.login(process.env.DISCORD_TOKEN);
