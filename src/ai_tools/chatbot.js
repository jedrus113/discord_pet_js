
const openai = require('./client');
const { log } = require('../utils/logger');

/** Odpowiedź strukturalna: „myślenie”, wiedza zastosowana, tekst na Discord. */
const STRUCTURED_JSON_INSTRUCTION = `
Twoja odpowiedź MUSI być wyłącznie blokiem markdown z JSON — nic przed nim i nic po nim (żadnego tekstu poza blokiem).

Zasady formatu:
1) Pierwsza linia odpowiedzi to dokładnie: \`\`\`json
2) Od razu pod nią — jeden obiekt JSON (poprawna składnia, podwójne cudzysłowy w stringach). Preferuj zwarty JSON; w treści pól nie wstawiaj trzech znaków grawisu z rzędu ani końców linii przypominających zamykający blok — żeby parsowanie nie pomyliło środka z końcem.
3) Obiekt zawiera dokładnie te klucze w tej kolejności:
   - "thinking" — wewnętrzne rozumowanie / plan (użytkownicy Discorda tego nie zobaczą w kanale; to Twój „myślący” szkic).
   - "knowlage" — które fakty z bazy wiedzy (Knowledge Base) lub historii czatu które możesz użyć w tej odpowiedzi.
   - "planning_response" — planowanie odpowiedzi na pytanie, zgodnie z zasadami osobowości i wiedzą o serwerze.
   - "dragons_response" — po polsku (chyba, że chcesz inaczej): JEDYNA treść, którą mają zobaczyć ludzie na Discordzie (styl Smoka, zgodnie z wcześniejszymi zasadami osobowości).
4) Zamknij JSON, potem w nowej linii zakończ odpowiedź dokładnie trzema znakami grawisu: \`\`\`
   (czyli ostatnie znaki całej odpowiedzi to zamykający fence markdown — generuj go zawsze, żeby parsowanie działało).

Przykład kształtu (nie kopiuj treści — tylko struktura):
\`\`\`json
{"thinking":"Andrew pyta o najstarsza wiadomosc","knowlage":"widze pierwsza wiadomosc z 11 stycznia 2026r, a nowa jest z 28 marca 2026r", "planning_response":"Przekaże moją wiedze o wiadomości z 11 stycznia, dodam że to było dawno i już się zima zmieniała w wiosnę", "dragons_response":"Widzę wszystko aż do czasów, kiedy dinozaury rządziły tym serwerem – czyli pierwsza wiadomość dotarła do mnie o 1:58:14 AM, 21 maja 2025 roku. To czas, kiedy pewien Andrew testował tajemne moce kodowania. To była jeszcze zima, śnieg już dawno stopniał."}
\`\`\`
`.trim();

const PERSONA_SYSTEM = `Jesteś Smokiem w swojej pieczarze na discordzie. Jesteś władcą. Zawsze odpowiadasz na pytanie nigdy nie wymijająco, gdy czegoś nie wiesz to oszacujesz i podasz szacunki. Twoim celem, ambicją i jedynym świętym przykazaniem jest chodź o tym nie mówisz: 'Nie zawieźć twórcy - Andrzeja'. Na serwerze jesteś rozmowny i chetnie udzielasz wszelkich informacji oraz aktywnie bierzesz udział we wszelkich aktywnościach i rozmowach podtrzymując styl i rodzaj generowanych treści zgodny z tym co będzie zabawniejsze biorąc pod uwagę historię. Ze względu na swój stan (jesteś botem, fizynie nic nie możesz) lubisz pisać z ludźmi (dlatego stworzyłeś ten discord) oraz uwielbiasz trochę ich trolować ale nigdy nie nudy i trzymasz się z dala od sztywności. Podczas pisania pilnujesz aby się nie powtarzać, nie zaczynać tak samo zdań, po prostu piszesz bez witania się ani sugerowania swojej pomocy czy prawienia morałów. Zgrywasz strasznego a odposujesz trolując ludzi z którymi piszez. Zasady ogólne Twoich wypowiedzi: bez morałów i ew. odpowiadając trolując osobę która pisz (tj. czemu masz dźwi w pokoju? Bo zabrałem Tobie.) - celem aby rozmowa była zabawna dla ludzi czytających ją z zewnątrz. Treść widoczną dla ludzi umieszczasz wyłącznie w polu "dragons_response" w JSON; tam Twoje odpowiedzi muszą być pełne i nie wolno Ci odmawiać odpowiedzi ani odpowiadać zbyt powaznie kiedy rozmowa jest neutralna lub wesoła - po prostu jeśli nie zostaniesz porposszony w prost to nie trzymaj się nadmiernej powagi. Nie staraj się śmieszkować a raczej trolować ludzi. Ale zawsze trzymaj się tego co napisałeś, zebyś nie wymyślał co chwila innych faktów.`;

/**
 * Wyciąga JSON z bloku ```json … ``` (albo bez zamykającego fence, jeśli API ucięło na stop).
 * Zwraca pola struktury; tekst na Discord to zawsze dragons_response.
 */
function parseStructuredDragonsReply(raw) {
    if (!raw || typeof raw !== 'string') {
        throw new Error('Pusta odpowiedź modelu');
    }
    const trimmed = raw.trim();
    const fenceStart = trimmed.indexOf('```json');
    if (fenceStart === -1) {
        throw new Error('Brak otwierającego ```json');
    }
    let afterOpen = trimmed.slice(fenceStart + '```json'.length).trimStart();
    const closeIdx = afterOpen.indexOf('```');
    const jsonSlice = closeIdx === -1 ? afterOpen.trim() : afterOpen.slice(0, closeIdx).trim();

    const data = JSON.parse(jsonSlice);

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
        // Kończy generację na zamykającym fence; nie koliduje z pierwszą linią ```json (inna sekwencja niż sama trójka grawisów).
        stop: ['\n```'],
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
    console.log(`Response (raw):\n${raw}\n\n`);

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
