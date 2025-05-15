const fs = require('fs').promises;
const path = require('path');
const { Guild, TextChannel } = require('discord.js');
const client = require('./client');
const { getAiResponse } = require('../ai_tools/chatbot');
// Możesz załadować te interfejsy jako obiekty JavaScript jeśli nadal potrzebujesz ich struktury dla odniesienia
// const { ServerConfig, ForbidenAppOnProtectedChannelAction, BotCycleAction } = require('./server_class_interface');

class MyDiscordHelperPerServer {
    static instances = {}; // objs per server

    constructor(guild) {
        this.server = guild;
        this.filePath = path.join('conf', `${this.server.id}.json`);
        MyDiscordHelperPerServer.instances[this.server.id] = this;
        
        this.saveableConfig = undefined;
        this.lastCycleTime = undefined;
        
        this.channelWelcome = null;
        this.channelFarewell = null;
    }

    async setupData() {
        console.log(`Setting up for ${this.server.name}`);
        try {
            await fs.access(this.filePath);
            const data = await fs.readFile(this.filePath, 'utf-8');
            this.saveableConfig = JSON.parse(data);
            
            try {
                if (this.saveableConfig.welcomeChannelId) {
                    this.channelWelcome = await this.server.channels.fetch(this.saveableConfig.welcomeChannelId);
                }
            } catch (error) {
                console.error("welcomeChannelId ERROR!");
                console.error(error);
            }
            
            try {
                if (this.saveableConfig.channelFarewellId) {
                    this.channelFarewell = await this.server.channels.fetch(this.saveableConfig.channelFarewellId);
                }
            } catch (error) {
                console.error("channelFarewellId ERROR!");
                console.error(error);
            }
        } catch (error) {
            console.error("ERROR!");
            console.error(error);
            
            this.saveableConfig = { "server_name": this.server.name, "conf_created": new Date().toLocaleString() };
            const dirPath = path.dirname(this.filePath);
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(this.filePath, JSON.stringify(this.saveableConfig, null, 4));
        }

        setInterval(async () => {
            try {
                await this.cycle();
            } catch (error) {
                console.error(`Błąd w cyklu dla guild ( ${this.server.id}) ${this.server.name}:`, error);
            }
        }, 5 * 60 * 1000);
    }

    async cycle() {
        const currentTime = Date.now();
        
        const action = this.saveableConfig ? this.saveableConfig.thisBotCycleMessage : undefined;
        
        if (!action) return;
        if (this.lastCycleTime && (currentTime - this.lastCycleTime) <= action.delayms) return;
        console.log("Cykl się zaczyna");
        
        this.lastCycleTime = currentTime; // Zaktualizuj czas ostatniego wywołania
        
        const actionChannel = await this.server.channels.fetch(action.destinationChannelId);

        const prompt = `Przekazujesz wiadomość, przekaż wiadomość z templatki dla całego serwera templatka:\n${action.messageTemplate}\n\nMusisz zachęcić lub przekazać tę wiadomość w nieoczekiwany sposób. Postaraj się wybrać między śmieszkowanie, powagą, złością a inną formą przekazu, liczę na Twoją kreatywność.\nWeź pod uwagę wybierając swój charakter godzinę. Ale nie mów o swoich sposobach wybierania nastroju.\n Jest godzina: ${new Date().toLocaleString()}`;
        const response = await getAiResponse(prompt, [], []) || action.messageTemplate;
        
        console.log(`Sending to channel ${actionChannel.name} message:\n${response}`);
        await actionChannel.send(response);
    }

    static get(guild_id) {
        return MyDiscordHelperPerServer.instances[guild_id];
    }

    async sendWelcomeMessage(user) {
        if (!this.channelWelcome) {
            console.error(`Missing welcome channel for server (${this.server.id}) ${this.server.name}`);
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Nowe jajo na serwerze, Witaj ${user.username}!`)
            .setDescription(`Nowe jajo <@${user.id}> zostało zauważone w gnieździe! Jego imię to ${user.displayName}`)
            .setImage('attachment://hi.jpg');

        const attachment = new AttachmentBuilder('src/statics/imgs/hi.jpg');

        this.channelWelcome.send({ embeds: [embed], files: [attachment] });
    }

    async sendFarewellMessage(user) {
        if (!this.channelFarewell) {
            console.error(`Missing channelFarewell for server (${this.server.id}) ${this.server.name}`);
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Rawr użytkownik: ${user.displayName} (${user.username}) został pożarty przez pobliskiego smoka!`)
            .setDescription(`Jeden z nas <@${user.id}> oddalił się od reszty. Niechaj będzie przestrogą dla reszty`)
            .setImage('attachment://bye.png');

        const attachment = new AttachmentBuilder('src/statics/imgs/bye.png');

        this.channelFarewell.send({ embeds: [embed], files: [attachment] });
    }

    async protectChannel(message) {
        const channel = message.channel;
        const channelId = channel.id;
        const appId = message.author.id;
        const protectChannelAction = this.saveableConfig?.appProtectedChannels?.[channelId]?.[appId];

        if (!protectChannelAction) return false;

        const destinationChannel = protectChannelAction.destinationChannelId
            ? await message.guild?.channels?.fetch(protectChannelAction.destinationChannelId)
            : undefined;

        if (destinationChannel) {
            const newMessage = protectChannelAction?.destinationMessageTemplate?.replace('{content}', message.content);
            const messageOptions = {
                content: newMessage || message.content,
                embeds: message.embeds,
                files: message.attachments.map(attachment => new AttachmentBuilder(attachment.url, { name: attachment.name }))
            };

            await destinationChannel.send(messageOptions);
        }

        if (protectChannelAction.delMessageTemplate) {
            const delMessage = await channel.send(protectChannelAction.delMessageTemplate);
            setTimeout(async () => {
                await delMessage.delete();
            }, 5000);
        }

        await message.delete();

        return true;
    }

    async getChannelResposeLvl(channelId) {
        return this.saveableConfig.thisBotChannelsResponseLvl?.[channelId];
    }

    async getChannelKnowlageBase() {
        let baseInfo = "\n";
        baseInfo += `Twoje ID: ${client.user.id}\n`;
        baseInfo += `Server name: ${this.saveableConfig.server_name}\n`;
        return baseInfo + this.saveableConfig.serverKnowlageBase;
    }

}

module.exports = MyDiscordHelperPerServer;