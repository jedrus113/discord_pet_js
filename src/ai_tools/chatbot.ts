import { Message, Collection } from 'discord.js';


import openai from './client'
import { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources/chat/completions';


export async function getAiResponse(prompt: string, openaiHistoryMessages: ChatCompletionMessageParam[], allImageUrls: string[]): Promise<string | null> {
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
            { role: 'system', content: "Jesteś Smokiem w swojej pieczarze na discordzie. Jesteś władcą i administratorem, zarządzasz wszystkim i kazdym. Mówisz jak smok do swoich smocząt." },
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

    return result.choices[0]?.message.content;
}


export async function openAiChat(message: Message, messages: Collection<string, Message<boolean>>, messageLengthLvl: Number) {
  const openaiHistoryMessages: ChatCompletionMessageParam[] = [];
  
  messages.forEach((oldMessage: Message) => {
    const content = oldMessage.cleanContent.trim();
    if (content.length > 0) {
      openaiHistoryMessages.push({
        "role": 'user',
        "content": `User: ${oldMessage.author.id}\nCurrent nick: ${oldMessage.author.username}\nCurrent display name to refer to user: ${oldMessage.author.displayName}\nMessage:\n${content}\n\nMusisz zachęcić lub przekazać tę wiadomość w nieoczekiwany sposób. Postaraj się wybrać między śmieszkowanie, powagą, złością a inną formą przekazu, liczę na Twoją kreatywność.\nWeź pod uwagę wybierajac swój charakter godzinę. Ale nie mów o swoich sposobach wybierania nastroju.\n Jest godzina: ${new Date().toLocaleString()}`,
      })
    }
  });

  const urlRegex = /https?:\/\/[^\s"']+|www\.[^\s"']+/g;
  const foundUrls = message.content.match(urlRegex) || [];

  const attachmentUrls = message.attachments.map((att) => att.url);
  const allImageUrls = [...attachmentUrls, ...foundUrls].filter((url) =>
    url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  );

  const prompt: string = `Otrzymałeś nową wiadomość. Na nią odpowiedz User: ${message.author.id}\nCurrent nick: ${message.author.username}\nCurrent display name to refer to user: ${message.author.displayName}\nMessage:\n${message.content}`

  return await getAiResponse(prompt, openaiHistoryMessages, allImageUrls) || "Nie udało się uzyskac odpowiedzi. Szczerbatek śpi??? czy coś :/ Wołać andrew!"
}