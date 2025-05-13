import client from './discord_tools/client';
import { Events, GuildMember, PartialGuildMember, Message } from 'discord.js';

import MyDiscordHelperPerServer from './discord_tools/server_class';


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
  console.log(`New user ${member.user.username} in ${member.guild.name}`)
  MyDiscordHelperPerServer.get(member.guild.id).send_welcome_message(member.user);
});


// user left server
client.on(Events.GuildMemberRemove, async (member: GuildMember | PartialGuildMember) => {
  console.log(`User ${member.user.username} quit ${member.guild.name}`)
  MyDiscordHelperPerServer.get(member.guild.id).send_farawel_message(member.user);
});


// message sent to server
client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.id == client.user?.id) return;
  
  const actionHanlder: MyDiscordHelperPerServer = MyDiscordHelperPerServer.get(message.guild?.id as string)
  if (await actionHanlder.protectChannel(message)) return


});

client.login(process.env.DISCORD_TOKEN);
