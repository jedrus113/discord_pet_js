# Funkcje

1. Witanie nowych i żegnanie odchodzących userów
2. Ochrona kanałów przed spamem botów przez przenoszenie / kasowanie wiadomości konkretnych botów
3. Timer sending messages in intervals
4. Odpowiadanie i udzielanie informacji po otagowaniu

# Setup

1. Clone repo

```
git clone https://github.com/jedrus113/discord_pet_js.git
```

2. Install Node.js and npm (for running locally without Docker/Podman)

```
sudo apt install nodejs npm
```

3. Install dependencies (JS libraries for the project)

```
npm install
```

4. Setup variables

- Copy `env_example` to `.env` and set the required secrets (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `OPENAI_API_KEY`).

# Run

## Local (Node on the host)

```
node src/index.js
```

Development with auto-restart on code changes:

```
npm run dev
```

## Podman (container, bind-mounted repo)

Requires [Podman](https://podman.io/). From the repository root:

```
chmod +x run_podman.sh
./run_podman.sh
```

This builds the image from `Dockerfile` (tag `discord-pet-js:dev`), mounts the project at `/app` in the container, runs `npm ci`, then `npm run dev` (`node --watch`). Edits under `src/` reload the process; after changing `.env`, save a source file or restart the container so the bot picks up new secrets.

- On SELinux-enabled systems, the script uses `-v "$PWD:/app:Z"` for the correct label. Elsewhere you can use `-v "$PWD:/app"` if you prefer.
- Secrets are read from the mounted `.env` at `/app/.env` (do not pass `--env-file` for this dev flow, or stale tokens can override the file).

You can build and run manually with the same image and volume flags if you do not use the script.

# Config

Edit server configs under `data_servers` (a folder is created per server after the bot has joined and you run the project again).

You will start with:

```
{
    "server_name": "Your server name",
    "conf_created": "5/21/2025, 2:34:53 AM"

}
```

- From there you can add `welcomeChannelId` and `channelFarewellId` to greet new users and say goodbye to leaving ones.
- Inside `serverKnowlageBase` you may set extra knowledge about your server for the bot when talking to users.
- `thisBotChannelsResponseLvl` is a map of `[CHANNEL_ID]: LVL` where `lvl` is `1` for short replies, `2` default, and `3` for long replies.
- `appProtectedChannels` reduces spam when bots such as PokeTwo cannot stay out of important channels: the bot can move messages to a chosen channel without losing content.

Example:

```
    "appProtectedChannels": {
        "[CHANNEL_ID_TO_PROTECT]": {
            "[USER_ID_TO_REMOVE_MESSAGES_FROM]": {
                "destinationChannelId": "[CHANNEL_ID_TO_TRANSFER_MESSAGES_TO]",
                "destinationMessageTemplate": "{content}",
                "delMessageTemplate": [STR_MESSAGE_TO_APPEAR_FOR_5_SEC_AFTER_MESSAGE_DELETED]
            }
        }
    }
```

- Cycle messages: send a message every *X* minutes. The text is analyzed and rewritten by the LLM before sending.

```
    "thisBotCycleMessage": {
        "destinationChannelId": [CHANNEL_ID_TO_SEND_MESSAGE_TO],
        "messageTemplate": "Hej, smocze dzieciaki! 🌈 Pijcie wodę, bo zdrowie jest najważniejsze! 💦",
        "delayMinutes": 240
    }
```

(`delayMinutes` is in minutes and should be a multiple of 5.)
