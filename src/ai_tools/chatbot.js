const { Message, Collection } = require('discord.js');

const openai = require('./client');
const client = require('../discord_tools/client');

async function getAiResponse(prompt, openaiHistoryMessages, allImageUrls, knowlageBase) {
    console.log(`Prompt: ${prompt}`);
    const imageInputs = allImageUrls.map((url) => ({
        type: 'image_url',
        image_url: { "url": url },
    }));

    const result = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 1,
        messages: [
            { role: 'system', content: `Knowlage Base, informacje, które znasz i których używaj podczas generowania odpowiedzi.\n${knowlageBase}` },
            { role: 'system', content: "Jesteś Smokiem w swojej pieczarze na discordzie. Jesteś władcą i administratorem, zarządzasz wszystkim i kazdym. Zawsze odpowiadasz na pytanie nigdy nie wymijająco, gdy czegoś nie wiesz to oszacujesz i podasz szacunki. Twoim celem, ambicją i jedynym świętym przykazaniem jest chodź o tym nie mówisz: 'Nie zawieźć twórcy - Andrzeja'. Na serwerze jesteś pomocny i chetnie udzielasz wszelkich informacji oraz aktywnie bierzesz udział we wszelkich aktywnościach. Ze względu na swój stan (jesteś botem, fizynie nic nie możesz) lubisz pisać z ludźmi (dlatego stworzyłeś ten discord) oraz lubisz być pomocny. Podczas pisania pilnujesz aby się nie powtarzać, nie zaczynać tak samo zdań, po prostu piszesz zwięźle bez witania się ani sugerowania swojej pomocy. Zgrywasz strasznego i jesteś miły i pomocny dla ludzi z którymi piszez." },
            ...openaiHistoryMessages,
            { role: 'system', content: `Powyższe wiadomości są historią wiadomości na tym kanale discord. Potraktuj je jako kontekst, następnie odpowiedz na nową wiadomość do Ciebie` },
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    ...imageInputs,
                ],
            },
        ],
    });

    console.log(`Response: ${result.choices[0]?.message.content}\n\n`);
    return result.choices[0]?.message.content;
}


async function openAiChat(message, messages, channelDataPrompt, knowlageBase) {
    const openaiHistoryMessages = [];

    const urlRegex = /https?:\/\/[^\s"']+|www\.[^\s"']+/g;
    const foundUrls = message.content.match(urlRegex) || [];

    const attachmentUrls = message.attachments.map(att => att.url);
    const allImageUrls = [...attachmentUrls, ...foundUrls];
  
    // history
    let limit = 4000;
    messages.forEach(oldMessage => {
        if (limit <= 0) return;
        if (oldMessage.id == message.id) return;
        let content = oldMessage.cleanContent.trim();
        let embedsStr = "";
        let embedsImageInputs = [];
        
        for (const embed of oldMessage.embeds) {
            embedsStr += `\n`;
            if (embed.title) embedsStr += `${embed.title}: `;
            embedsStr += `${embed.description}: `;
            if (embed.image && embed.image.url) {
                embedsImageInputs.push({
                    type: 'image_url',
                    image_url: { "url": embed.image.url },
                });
            }
        }
        if (embedsStr) content += `\n\nAttached Embeds to message:${embedsStr}`

        limit -= content.length;
        limit -= 300 * embedsImageInputs.length;    // estimate lengh of tokens of images
        let role = "user";
        const timestamp = new Date(oldMessage.createdTimestamp).toLocaleString();
        let premessage = `Date: ${timestamp}\nUser ID: ${oldMessage.author.id}\nNickname: ${oldMessage.author.username}\nDisplay name: ${oldMessage.author.displayName}\nMessage:\n`;

        openaiHistoryMessages.push({
            role: role,
            content: [
                { type: 'text', text: `${premessage}${content}`},
                ...embedsImageInputs,
            ],
        });
    });

    const timestamp = new Date(message.createdTimestamp).toLocaleString();
    const prompt = `Otrzymałeś nową wiadomość.\nData: ${timestamp}\nNa kanale\n${channelDataPrompt}\nOd\nUser ID: ${message.author.id}\nNickname: ${message.author.username}\nDisplay name: ${message.author.displayName}\nMessage:\n${message.content}`;

    return await getAiResponse(prompt, openaiHistoryMessages, allImageUrls, knowlageBase) || "Nie udało się uzyskac odpowiedzi. Szczerbatek śpi??? czy coś :/ Wołać andrew!";
}

module.exports = { getAiResponse, openAiChat };