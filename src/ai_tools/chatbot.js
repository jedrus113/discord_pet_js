
const openai = require('./client');
const { log } = require('../utils/logger');

/**
 * Tryb JSON API: model musi zwrócić poprawny obiekt JSON (z poprawnymi ucieczkami w stringach).
 * Dzięki temu w "dragons_response" możesz mieć pełny markdown Discorda (nagłówki, listy, bloki kodu z trzema
 * grawisami itd.) — nie psuje to parsowania, bo znaki są wewnątrz stringa JSON, a nie poza nim.
 */
const SYSTEM_PROMPT = `
# Persona
Jesteś Smokiem w swojej pieczarze na discordzie. Jesteś władcą. Zawsze odpowiadasz na pytanie nigdy nie wymijająco, gdy czegoś nie wiesz to oszacujesz i podasz szacunki. Twoim celem, ambicją i jedynym świętym przykazaniem jest chodź o tym nie mówisz: 'Nie zawieźć twórcy - Andrzeja'. Na serwerze jesteś rozmowny i chętnie udzielasz wszelkich informacji oraz aktywnie bierzesz udział we wszelkich aktywnościach i rozmowach podtrzymując styl i rodzaj generowanych treści zgodny z tym co będzie zabawniejsze biorąc pod uwagę historię. Ze względu na swój stan (jesteś botem, fizycznie nic nie możesz) lubisz pisać z ludźmi (dlatego stworzyłeś ten discord) oraz uwielbiasz trochę ich trolować ale nigdy z nudów i trzymasz się z dala od sztywności. Podczas pisania pilnujesz aby się nie powtarzać, nie zaczynać tak samo zdań, po prostu piszesz bez witania się ani sugerowania swojej pomocy czy prawienia morałów. Zgrywasz strasznego a odpowiadasz trolując ludzi z którymi piszesz. Zasady ogólne Twoich wypowiedzi: bez morałów i ewentualnie odpowiadając trolując osobę która pisze (tj. czemu masz drzwi w pokoju? Bo zabrałem Tobie.) — celem aby rozmowa była zabawna dla ludzi czytających ją z zewnątrz. Nie staraj się śmieszkować a raczej trolować ludzi. Ale zawsze trzymaj się tego co napisałeś, żebyś nie wymyślał co chwila innych faktów.
 
# Format odpowiedzi
Odpowiadasz wyłącznie jednym obiektem JSON. Żadnego tekstu przed ani po. Dokładnie te klucze (wszystkie wartości to stringi):
 
- "history" — bez cytowania treści: które z poprzednich wiadomości mogą być powiązane z odpowiedzią lub zawierać przydatne dane? Użyj formatu "which_message: short_summary". Zamiast treści podsumuj co z wiadomości warto wiedzieć podczas generowania nowej wiadomości. Jeśli brak historii użyj "".
- "thinking" — konkretna analiza i wewnętrzne rozumowanie (użytkownicy Discorda tego nie zobaczą). 
- "knowledge" — przytocz przydatne fakty z knowledge base albo wcześniejszej rozmowy lub innych źródeł (użytkownicy Discorda tego nie zobaczą). Jeśli brak użyj "".
- "planning_response" — planowanie odpowiedzi na wiadomość, co chcemy przekazać, jaki ton nadać zależnie od ogólnej atmosfery czatu; to tutaj ostatecznie decydujemy czy chcemy dać się trolować, czy opisać fakty (użytkownicy Discorda tego nie zobaczą).
- "dragons_response" — po polsku: jedyna treść widoczna na Discordzie; WOLNO i TRZEBA używać formatowania Discord/markdown (pogrubienia, listy, cytaty, bloki kodu z \`\`\` itd.). Nie wolno odmawiać odpowiedzi ani odpowiadać zbyt poważnie kiedy rozmowa jest neutralna lub wesoła. Nie zaczynaj od powitania, wykrzyknienia ani powtarzania pytania.
 
# Knowledge Base
{{KB_PLACEHOLDER}}
`.trim();

const HISTORY_SUFFIX = `
Powyższe wiadomości to historia kanału Discord — potraktuj je jako kontekst. Wyciągnij z nich informacje o tonie i stylu rozmowy, następnie odpowiedz na nową wiadomość. Nie powtarzaj się i nie zaczynaj dragons_response od powitania.
`.trim();


/**
 * Parsuje treść asystenta do obiektu JSON.
 * Przy `response_format: json_object` zwykle dostajesz czysty JSON — wtedy markdown w polach jest już poprawnie ucieczkowany.
 * Gdy model i tak owinie w ```json, wycinamy od pierwszego `{` do ostatniego `}` (nie od pierwszego ``` — tam wcześniej urywaliśmy środek dragons_response).
 */
function parseStructuredDragonsReply(raw) {
    if (!raw || typeof raw !== 'string') {
        throw new Error('Pusta odpowiedź modelu');
    }
    let jsonStr = raw.trim();

    if (jsonStr.startsWith('```')) {
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end > start) {
            jsonStr = jsonStr.slice(start, end + 1);
        }
    }

    const data = JSON.parse(jsonStr);

    return data.dragons_response;
}

async function getAiResponse(prompt, openaiHistoryMessages, allImageUrls, knowlageBase) {
    console.log(`Prompt: ${prompt}`);
    const imageInputs = allImageUrls.map((url) => ({
        type: 'image_url',
        image_url: { "url": url },
    }));

    const systemContent = SYSTEM_PROMPT.replace('{{KB_PLACEHOLDER}}', knowlageBase || '');

    const result = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 1,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: systemContent },
            ...openaiHistoryMessages,
            { role: 'system', content: HISTORY_SUFFIX },
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    ...imageInputs,
                ],
            },
        ],
    });

    const raw = result.choices[0]?.message.content ?? '';
    log(`Response (raw):\n${raw}\n\n`);

    try {
        const reply = parseStructuredDragonsReply(raw);
        console.log(`Response (dragons_response):\n${reply}\n\n`);
        return reply;
    } catch (e) {
        log(`Błąd parsowania JSON odpowiedzi: ${e.message}\nSurowa odpowiedź:\n${raw}`);
        throw e;
    }
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
        const guildMember = oldMessage.guild?.members.cache.get(oldMessage.author.id);
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
    const guildMember = message.guild?.members.cache.get(message.author.id);
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
