
export interface BotCycleAction {
    destinationChannelId: string;
    messageTemplate: string;
    delayms: number;
}

export interface ForbidenAppOnProtectedChannelAction {
    destinationChannelId?: string;
    destinationMessageTemplate?: string;
    delMessageTemplate?: string;
}

export interface ForbidenAppOnProtectedChannelMap {
    [appId: string]: ForbidenAppOnProtectedChannelAction;
}

export interface ProtectedChannelMap {
    [channelId: string]: ForbidenAppOnProtectedChannelMap;
}

export interface ChannelBotChannelsResponseLvlMap {
    [channelId: string]: Number;
}

export interface ServerConfig {
    server_name: string;
    conf_created: string;
    conf_updated?: string;
    serverKnowlageBase?: string;

    welcomeChannelId?: string;
    channelFarewellId?: string;

    appProtectedChannels?: ProtectedChannelMap;
    thisBotChannelsResponseLvl?: ChannelBotChannelsResponseLvlMap;
    thisBotCycleMessage?: BotCycleAction;
}
