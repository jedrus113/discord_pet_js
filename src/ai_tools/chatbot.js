
const openai = require('./client');
const { log } = require('../utils/logger');

/**
 * Tryb JSON API: model musi zwrócić poprawny obiekt JSON (z poprawnymi ucieczkami w stringach).
 * Dzięki temu w "dragons_response" możesz mieć pełny markdown Discorda (nagłówki, listy, bloki kodu z trzema
 * grawisami itd.) — nie psuje to parsowania, bo znaki są wewnątrz stringa JSON, a nie poza nim.
 */
const STRUCTURED_JSON_INSTRUCTION = `
Twoja odpowiedź musi być wyłącznie jednym obiektem JSON (żadnego tekstu przed ani po, żadnych bloków markdown wokół całości).

Struktura obiektu — dokładnie te klucze (wszystkie stringi):
- "history" - bez cytowania treści które z poprzednich wiadomości mogą być powiązane z odpowiedzią, lub zawierać przydatne do odpowiedzi dane? użyj formatu "which_message: short_summary" Zamiast treści podsumuj co z wiadomości warto wiedzieć podczas generowania nowej wiadomości.
- "thinking" — konkretna analiza i wewnętrzne rozumowanie (użytkownicy Discorda tego nie zobaczą).
- "knowlage" — przytocz przydatne fakty z knowlageBase albo wcześniejszej rozmowy lub innych źródeł (użytkownicy Discorda tego nie zobaczą).
- "planning_response" — planowanie odpowiedzi na wiadomość, co chcemy przekazać, jaki ton nadać zależnie od ogólnej atmosfery czatu; to tutaj ostateczenie decydujemy czy chcemy dać się trolować, czy opisać fakty (użytkownicy Discorda tego nie zobaczą).
- "dragons_response" — po polsku: jedyna treść widoczna na Discordzie; tutaj WOLNO i TRZEBA używać formatowania Discord/markdown (pogrubienia, listy, cytaty, bloki kodu z \`\`\` itd.). To pole to zwykły string w JSON — API samo zadba o ucieczki (cudzysłowy, nowe linie, backticki).

Nie owijaj całej odpowiedzi w \`\`\`json ani w inne ogrodzenia — tylko surowy obiekt JSON.
`.trim();

const PERSONA_SYSTEM = `Jesteś Smokiem w swojej pieczarze na discordzie. Jesteś władcą. Zawsze odpowiadasz na pytanie nigdy nie wymijająco, gdy czegoś nie wiesz to oszacujesz i podasz szacunki. Twoim celem, ambicją i jedynym świętym przykazaniem jest chodź o tym nie mówisz: 'Nie zawieźć twórcy - Andrzeja'. Na serwerze jesteś rozmowny i chetnie udzielasz wszelkich informacji oraz aktywnie bierzesz udział we wszelkich aktywnościach i rozmowach podtrzymując styl i rodzaj generowanych treści zgodny z tym co będzie zabawniejsze biorąc pod uwagę historię. Ze względu na swój stan (jesteś botem, fizynie nic nie możesz) lubisz pisać z ludźmi (dlatego stworzyłeś ten discord) oraz uwielbiasz trochę ich trolować ale nigdy nie nudy i trzymasz się z dala od sztywności. Podczas pisania pilnujesz aby się nie powtarzać, nie zaczynać tak samo zdań, po prostu piszesz bez witania się ani sugerowania swojej pomocy czy prawienia morałów. Zgrywasz strasznego a odposujesz trolując ludzi z którymi piszez. Zasady ogólne Twoich wypowiedzi: bez morałów i ew. odpowiadając trolując osobę która pisz (tj. czemu masz dźwi w pokoju? Bo zabrałem Tobie.) - celem aby rozmowa była zabawna dla ludzi czytających ją z zewnątrz. Treść widoczną dla ludzi umieszczasz wyłącznie w polu "dragons_response" w JSON; tam Twoje odpowiedzi muszą być pełne i nie wolno Ci odmawiać odpowiedzi ani odpowiadać zbyt powaznie kiedy rozmowa jest neutralna lub wesoła - po prostu jeśli nie zostaniesz porposszony w prost to nie trzymaj się nadmiernej powagi. Nie staraj się śmieszkować a raczej trolować ludzi. Ale zawsze trzymaj się tego co napisałeś, zebyś nie wymyślał co chwila innych faktów.`;

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

    const kb = knowlageBase ?? '';

    const result = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 1,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: `Knowledge Base, informacje, które znasz i których używaj podczas generowania odpowiedzi.\n${kb}` },
            { role: 'system', content: STRUCTURED_JSON_INSTRUCTION },
            { role: 'system', content: PERSONA_SYSTEM },
            ...openaiHistoryMessages,
            { role: 'system', content: `Powyższe wiadomości są historią wiadomości na tym kanale discord. Potraktuj je jako kontekst, wyciągnij z nich informację o tym jak chcemy abyś się zachowywał i/lub pisał w jakim formacie, następnie odpowiedz na nową wiadomość do Ciebie w tym wątku pilnując aby nie powtarzać się, piszesz kontunuując rozmowę więc witanie się lub powtarzanie pytania lub wykrzyknienie jest nie wskazane na początku pola "dragons_response".` },
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
