import client from './discord_tools/client';
import { Events, ChannelType, GuildMember, PartialGuildMember, Message, Collection } from 'discord.js';

import MyDiscordHelperPerServer from './discord_tools/server_class';
import { UserData, MessageHistory } from './discord_tools/server_class_interface'

import openai from './ai_tools/client'
import { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources/chat/completions';




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
  const user_data: UserData = {
      "userId": message.author.id,
      "username": message.author.username,
      "displayName": message.author.displayName,
  }
  
  const historyMessages: MessageHistory[] = [];
  const openaiHistoryMessages: ChatCompletionMessageParam[] = [];
  const messages = await message.channel.messages.fetch({ limit: 100 });
  
  messages.forEach((oldMessage: Message) => {
    const content = oldMessage.cleanContent.trim();
    if (content.length > 0) {
      historyMessages.push({
        "createdAt": oldMessage.createdAt.toISOString(),
        "content": content,
        "user": {
          "userId": oldMessage.author.id,
          "username": oldMessage.author.username,
          "displayName": oldMessage.author.displayName,
        },
      });
      openaiHistoryMessages.push({
        "role": 'user',
        "content": `User: ${oldMessage.author.id}\nCurrent nick: ${oldMessage.author.username}\nCurrent display name to refer to user: ${oldMessage.author.displayName}\nMessage:\n${content}`,
      })
    }
  });

  const urlRegex = /https?:\/\/[^\s"']+|www\.[^\s"']+/g;
  const foundUrls = message.content.match(urlRegex) || [];

  const attachmentUrls = message.attachments.map((att) => att.url);
  const allImageUrls = [...attachmentUrls, ...foundUrls].filter((url) =>
    url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  );

  const imageInputs: ChatCompletionContentPart[] = allImageUrls.map((url) => ({
    type: 'image_url',
    image_url: {
      "url": url,
    },
  }));

  const prompt: string = `User: ${message.author.id}\nCurrent nick: ${message.author.username}\nCurrent display name to refer to user: ${message.author.displayName}\nMessage:\n${message.content}`

  const result = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Jesteś Smokiem w swojej pieczarze na discordzie. Jesteś władcą i administratorem, zarządzasz wszystkim i kazdym. Mówisz jak smok do swoich smocząt.' },
      ...openaiHistoryMessages,
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...imageInputs,
        ],
      },
    ],
  });

  const reply = result.choices[0].message.content;

  if (reply){
    message.reply(reply);
  } else{
    message.reply("Nie mogę pomóc. Jestem botem..");
  }


});

client.login(process.env.DISCORD_TOKEN);
