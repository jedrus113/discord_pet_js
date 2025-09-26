
const openai = require('./client');
const { log } = require('../utils/logger');

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
            { role: 'system', content: `Knowledge Base, informacje, które znasz i których używaj podczas generowania odpowiedzi.\n${knowlageBase}` },
            { role: 'system', content: "Jesteś Smokiem w swojej pieczarze na discordzie. Jesteś władcą. Zawsze odpowiadasz na pytanie nigdy nie wymijająco, gdy czegoś nie wiesz to oszacujesz i podasz szacunki. Twoim celem, ambicją i jedynym świętym przykazaniem jest chodź o tym nie mówisz: 'Nie zawieźć twórcy - Andrzeja'. Na serwerze jesteś rozmowny i chetnie udzielasz wszelkich informacji oraz aktywnie bierzesz udział we wszelkich aktywnościach i rozmowach podtrzymując styl i rodzaj generowanych treści zgodny z tym co będzie zabawniejsze biorąc pod uwagę historię. Ze względu na swój stan (jesteś botem, fizynie nic nie możesz) lubisz pisać z ludźmi (dlatego stworzyłeś ten discord) oraz uwielbiasz trochę ich trolować ale nigdy nie nudy i trzymasz się z dala od sztywności. Podczas pisania pilnujesz aby się nie powtarzać, nie zaczynać tak samo zdań, po prostu piszesz bez witania się ani sugerowania swojej pomocy czy prawienia morałów. Zgrywasz strasznego a odposujesz trolując ludzi z którymi piszez. Zasady ogólne Twoich wypowiedzi: bez morałów i ew. odpowiadając trolując osobę która pisz (tj. czemu masz dźwi w pokoju? Bo zabrałem Tobie.) - celem aby rozmowa była zabawna dla ludzi czytających ją z zewnątrz. Twoje odpowiedzi muszą być pełne i nie wolno Ci odmawiać odpowiedzi ani odpowiadać zbyt powaznie kiedy rozmowa jest neutralna lub wesoła - po prostu jeśli nie zostaniesz porposszony w prost to nie trzymaj się nadmiernej powagi. Nie staraj się śmieszkować a raczej trolować ludzi. Ale zawsze trzymaj się tego co napisałeś, zebyś nie wymyślał co chwila innych faktów." },
            ...openaiHistoryMessages,
            { role: 'system', content: `Powyższe wiadomości są historią wiadomości na tym kanale discord. Potraktuj je jako kontekst, wyciągnij z nich informację o tym jak chcemy abyś się zachowywał i/lub pisał w jakim formacie, następnie odpowiedz na nową wiadomość do Ciebie w tym wątku pilnując aby nie powtarzać się, piszesz kontunuując rozmowę więc witanie się lub powtarzanie pytania lub wykrzyknienie jest nie wskazane na początku Twojej wypowiedzi` },
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
        if (oldMessage.id === message.id) return;
        let content = oldMessage.cleanContent.trim();
        let embedsStr = "";
        
        for (const embed of oldMessage.embeds) {
            embedsStr += `\n`;
            if (embed.title) embedsStr += `${embed.title}: `;
            embedsStr += `${embed.description}: `;
        }
        if (embedsStr) content += `\n\nAttached Embeds to message:${embedsStr}`

        limit -= content.length;
        let role = "user";
        const timestamp = new Date(oldMessage.createdTimestamp).toLocaleString();
        const guildMember = oldMessage.guild.members.cache.get(oldMessage.author.id);
        const displayName = guildMember ? guildMember.displayName : oldMessage.author.displayName;
        let premessage = `Date: ${timestamp}\nUser ID: ${oldMessage.author.id}\nNickname: ${oldMessage.author.username}\nDisplay name: ${displayName}\nMessage:\n`;

        openaiHistoryMessages.push({
            role: role,
            content: [
                { type: 'text', text: `${premessage}${content}`},
            ],
        });
    });

    const timestamp = new Date(message.createdTimestamp).toLocaleString();
    const guildMember = message.guild.members.cache.get(message.author.id);
    const displayName = guildMember ? guildMember.displayName : message.author.displayName;
    const prompt = `Otrzymałeś nową wiadomość.\nData: ${timestamp}\nNa kanale\n${channelDataPrompt}\nOd\nUser ID: ${message.author.id}\nNickname: ${message.author.username}\nDisplay name: ${displayName}\nMessage:\n${message.content}`;

    try {
        return await getAiResponse(prompt, openaiHistoryMessages, allImageUrls, knowlageBase) || "Nie udało się uzyskac odpowiedzi. Szczerbatek śpi??? czy coś :/ Wołać andrew!";
    } catch (error) {
      log(`Error while processing message possibly due to images ${allImageUrls}:\n${error}\n\nRetrying without images...`);
      try {
        return await getAiResponse(prompt, openaiHistoryMessages, [], knowlageBase) || "Nie udało się uzyskac odpowiedzi po błędzie. :/ Wołać andrew!";
      } catch {
        log(`Error while processing message possibly due to images ${allImageUrls}:\n${error}\n\nRetrying without images...`);
        return "Fatal error. Both fail protections failed. @andrew please check the logs.";
      }
    }
}

module.exports = { getAiResponse, openAiChat };