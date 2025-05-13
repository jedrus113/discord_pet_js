import { promises as fs } from 'fs';
import path from 'path';
import { Guild, TextChannel, User, EmbedBuilder, AttachmentBuilder, Message } from 'discord.js';
import { ServerConfig, ForbidenAppOnProtectedChannelAction, BotCycleAction } from './server_class_interface'
import { getAiResponse } from '../ai_tools/chatbot'


class MyDiscordHelperPerServer {
    private static instances: Record<string, MyDiscordHelperPerServer> = {}; // objs per server
    
    private server: Guild;
    private filePath: string;
    
    private saveableConfig?: ServerConfig;

    private lastCycleTime?: number;
    
    private channelWelcome: TextChannel | null = null;
    private channelFarewell: TextChannel | null = null;

    constructor(guild: Guild) {
        this.server = guild;
        this.filePath = path.join('conf', `${this.server.id}.json`);
        MyDiscordHelperPerServer.instances[this.server.id] = this;
    }

    async setupData() {
        console.log(`Setting up for ${this.server.name}`)
        try {
            await fs.access(this.filePath);
            const data = await fs.readFile(this.filePath, 'utf-8');
            this.saveableConfig = JSON.parse(data) as ServerConfig;
            
            try{
                if (this.saveableConfig.welcomeChannelId) {
                    this.channelWelcome = await this.server.channels.fetch(this.saveableConfig.welcomeChannelId as string) as TextChannel;
                }
            } catch (error) {
                console.error("welcomeChannelId ERROR!")
                console.error(error);
            }
            
            try{
                if (this.saveableConfig.channelFarewellId) {
                    this.channelWelcome = await this.server.channels.fetch(this.saveableConfig.channelFarewellId as string) as TextChannel;
                }
            } catch (error) {
                console.error("channelFarewellId ERROR!")
                console.error(error);
            }
        } catch (error) {
            console.error("ERROR!")
            console.error(error)
            // creates empty file if not exists / and folders if need creation
            this.saveableConfig = {"server_name": this.server.name, "conf_created": new Date().toLocaleString()};
            const dirPath = path.dirname(this.filePath);
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(this.filePath, JSON.stringify(this.saveableConfig, null, 4));
        }

        setInterval(async () => {
            try {
                await this.cycle(); // Wywołaj funkcję cycle
            } catch (error) {
                console.error(`Błąd w cyklu dla guild ( ${this.server.id}) ${this.server.name}:`, error);
            }
        }, 5 * 60 * 1000); // 5 minut w milisekundach
    }

    private async cycle() {
        const currentTime = Date.now();
        
        const action: BotCycleAction | undefined = this.saveableConfig!.thisBotCycleMessage;
        
        if (!action) return;
        if (this.lastCycleTime && (currentTime - this.lastCycleTime) <= action.delayms) return;
        console.log("Cykl się zaczyna");
        
        this.lastCycleTime = currentTime; // Zaktualizuj czas ostatniego wywołania
        
        const actionChannel: TextChannel = await this.server.channels.fetch(action.destinationChannelId) as TextChannel;

        const prompt: string = `Przekazujesz wiadomość, przekaż wiadomość z templatki dla całego serwera templatka:\n${action.messageTemplate}`;
        const response: string = await getAiResponse(prompt, [], []) || action.messageTemplate;
        
        console.log(`Sending to channel ${actionChannel.name} message:\n${response}`);
        await actionChannel.send(response);
    }

    static get(guild_id: string) {
        return MyDiscordHelperPerServer.instances[guild_id];
    }

    async send_welcome_message(user: User) {
        if (!this.channelWelcome){
            console.error(`Missing welcome channel for server (${this.server.id}) ${this.server.name}`)
            return
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Nowe jajo na serwerze, Witaj ${user.username}!`)
            .setDescription(`Nowe jajo <@${user.id}> zostało zauważone w gnieździe! Jego imie to ${user.displayName}`)
            .setImage('attachment://hi.jpg');

        const attachment = new AttachmentBuilder('src/statics/imgs/hi.jpg');


        this.channelWelcome.send({ embeds: [embed], files: [attachment] })
    }

    async send_farawel_message(user: User) {
        if (!this.channelFarewell){
            console.error(`Missing channelFarewell for server (${this.server.id}) ${this.server.name}`)
            return
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Rawr użytkownik: ${user.displayName} (${user.username}) został pożarty przez pobliskiego smoka!`)
            .setDescription(`Jeden z nas <@${user.id}> oddalił sie od reszty. Niechaj bedzie przestrogą dla reszty`)
            .setImage('attachment://bye.png');

        const attachment = new AttachmentBuilder('src/statics/imgs/bye.png');


        this.channelFarewell.send({ embeds: [embed], files: [attachment] })
    }

    async protectChannel(message: Message) {
        const channel: TextChannel = message.channel as TextChannel;
        const channelId: string = channel.id;
        const appId: string = message.author.id;
        const protectChannelAction: ForbidenAppOnProtectedChannelAction | undefined = this.saveableConfig?.appProtectedChannels?.[channelId]?.[appId];
        
        if(!protectChannelAction) return false;

        const destinationChannel = protectChannelAction.destinationChannelId
            ? await message.guild?.channels?.fetch(protectChannelAction.destinationChannelId) as TextChannel
            : undefined;

        if (destinationChannel) {
            const newMessage: string | undefined = protectChannelAction?.destinationMessageTemplate?.replace('{content}', message.content);
            const messageOptions = {
                content: newMessage || message.content,
                embeds: message.embeds,
                files: message.attachments.map(attachment => new AttachmentBuilder(attachment.url, { name: attachment.name }))
            };

            await destinationChannel.send(messageOptions);
        }
        
        if (protectChannelAction.delMessageTemplate){
            const delMessage: Message = await channel.send(protectChannelAction.delMessageTemplate);
            setTimeout(async () => {
                await delMessage.delete();
            }, 5000);
        }

        await message.delete();

        return true;
    }

    async getChannelResposeLvl(channelId: string) {
        return this.saveableConfig!.thisBotChannelsResponseLvl?.[channelId];
    }
    
}

export default MyDiscordHelperPerServer;
