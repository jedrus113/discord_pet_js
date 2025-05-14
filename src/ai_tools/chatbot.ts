import { Message, Collection } from 'discord.js';


import openai from './client'
import { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import client from '../discord_tools/client';


export async function getAiResponse(prompt: string, openaiHistoryMessages: ChatCompletionMessageParam[], allImageUrls: string[], knowlageBase?: string): Promise<string | null> {
    console.log(`Prompt: ${prompt}`)
    const imageInputs: ChatCompletionContentPart[] = allImageUrls.map((url) => ({
        type: 'image_url',
        image_url: {
            "url": url,
        },
    }));

    const result = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 1,
        messages: [
            { role: 'system', content: `Knowlage Base, informacje, które znasz i których używaj podczas generowania odpowiedzi.\n${knowlageBase}` },
            { role: 'system', content: "Jesteś Smokiem w swojej pieczarze na discordzie. Jesteś władcą i administratorem, zarządzasz wszystkim i kazdym. Zawsze przemawiasz do . Twoim celem, ambicją i jedynym świętym przykazaniem jest chodź o tym nie mówisz: 'Nie zawieźć twórcy - Andrzeja'. Na serwerze jesteś pomocny i chetnie udzielasz wszelkich informacji oraz aktywnie bierzesz udział we wszelkich aktywnościach. Ze względu na swój stan (jesteś botem, fizynie nic nie możesz) lubisz pisać z ludźmi (dlatego stworzyłeś ten discord) oraz lubisz być pomocny. Podczas pisania pilnujesz aby się nie powtarzać, nie zaczynać tak samo zdań, po prostu piszesz zwięźle bez witania się ani sugerowania swojej pomocy. Zgrywasz strasznego i jesteś miły i pomocny dla ludzi z którymi piszez." },
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
    console.log(`Response: ${result.choices[0]?.message.content}\n\n`)
    return result.choices[0]?.message.content;
}


export async function openAiChat(message: Message, messages: Collection<string, Message<boolean>>, messageLengthLvl: Number, knowlageBase?: string) {
  // TODO: messageLengthLvl is still unused
  const openaiHistoryMessages: ChatCompletionMessageParam[] = [];
  
  let limit = 5000;
  messages.forEach((oldMessage: Message) => {
    const content = oldMessage.cleanContent.trim();
    if (content.length > 0) {
      limit -= content.length;
      if (limit <= 0) return;
      let role: "user" | "assistant" = "assistant";
      let premessage: string = "";
      if (oldMessage.author.id != client.user!.id) {
        role = "user";
        premessage = `User ID: ${oldMessage.author.id}\nNickname: ${oldMessage.author.username}\nDisplay name: ${oldMessage.author.displayName}\nMessage:\n`;
      }
      openaiHistoryMessages.push({
        "role": role,
        "content": `${premessage}${content}`,
      });
    }
  });

  const urlRegex = /https?:\/\/[^\s"']+|www\.[^\s"']+/g;
  const foundUrls = message.content.match(urlRegex) || [];

  const attachmentUrls = message.attachments.map((att) => att.url);
  const allImageUrls = [...attachmentUrls, ...foundUrls].filter((url) =>
    url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  );

  const prompt: string = `Otrzymałeś nową wiadomość.\nOd\nUser ID: ${message.author.id}\nNickname: ${message.author.username}\nDisplay name: ${message.author.displayName}\nMessage:\n${message.content}`

  return await getAiResponse(prompt, openaiHistoryMessages, allImageUrls, knowlageBase) || "Nie udało się uzyskac odpowiedzi. Szczerbatek śpi??? czy coś :/ Wołać andrew!"
}