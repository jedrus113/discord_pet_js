# Funkcje
1. Witanie nowych i żegnanie odchodzących userów
2. Ochrona kanałów przed spamem botów przez przenoszenie / kasowanie wiadomości konkretych botów
3. Timer sending messages in interwals
4. Odpowiadanie i udzielanie informacji po otagowaniu



# Setup
1. Clone repo
```
git clone https://github.com/jedrus113/discord_pet_js.git
```

2. Install Node.js and npm
```
sudo apt install nodejs npm
```

3. Install depedencies (js libraries for project)
```
npm install
```

3. (5) Install ffmpeg.
Windows:
    winget install ffmpeg
Linux:
    sudo apt install ffmpeg

4. Setup variables
- rename `env_example` to `.env` and put required secrets inside


# Run
```
node src/index.js
```

# Config
Edit server configs in data_servers (file fill be created when you rerun project after join bot to your server)

You will start with:
```
{
    "server_name": "Your server name",
    "conf_created": "5/21/2025, 2:34:53 AM"

}
```

- And from there you can add `welcomeChannelId` and `channelFarewellId` to say hello to new users and bye to leaving ones.
- Inside `serverKnowlageBase` you may setup additional knowlage about your server that bot shall know and/or use while talking with users
- `thisBotChannelsResponseLvl` is a dict of `[CHANNEL_ID]: LVL` where lvl is 1 for short responses, 2 is default and 3 is for long full responses
- `appProtectedChannels` is a way to unspam channels when bots like PokeTwo cant be configured to not use important channels yet you want to keep it out of the channel. Bot can move messages to designated channels without losing content.
ex:
```
    "appProtectedChannels": {
        "[CHANNEL_ID_TO_PROTECT]": {
            "[USER_ID_TO_REMOVE_MESSAGES_FROM]": {
                "destinationChannelId": "[CHANNEL_ID_TO_TRANSFER_MESSAGES_TO]",
                "destinationMessageTemplate": "{content}",  # content is the content of message, additionally can be added context like "moved from General:\n{content}"
                "delMessageTemplate": [STR_MESSAGE_TO_APPEAR_FOR_5_SEC_AFTER_MESSAGE_DELETED]
            }
        }
}
```

- Cycle messages to send message each X minutes. Message will be analized and retyped by LLM
```
    "thisBotCycleMessage": {
        "destinationChannelId": [CHANNEL_ID_TO_SEND_MESSAGE_TO],
        "messageTemplate": "Hej, smocze dzieciaki! 🌈 Pijcie wodę, bo zdrowie jest najważniejsze! 💦",  # example message will be re created before sending
        "delayMinutes": 240     # minutes delay miltiply of 5min
    }
```
