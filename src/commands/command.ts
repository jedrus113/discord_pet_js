import { Collection, ClientApplication } from 'discord.js';
import client from '../discord_tools/client'

export const commandsList: Collection<string, any> = new Collection();


// Model names and commands setup
const MODEL_NAMES = ["dalle3", "option2"];

const commands2 = [
    {
        name: 'generate_image',
        description: 'Generate an image using a selected model and prompt.',
        options: [
            {
                name: 'model',
                type: 3, // STRING
                description: 'Choose a model',
                required: true,
                autocomplete: true,
            },
            {
                name: 'prompt',
                type: 3, // STRING
                description: 'Enter your prompt',
                required: true,
            }
        ]
    }
];

commandsList.set('ping', {
    name: 'ping',
    description: 'Sprawdza responsywność bota',
    execute(message: any) {
        message.channel.send('Pong!');
    }
});
