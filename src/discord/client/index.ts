// require the discord.js module
import { Client, Collection, GatewayIntentBits } from 'discord.js';

class ExtendedClient extends Client {
    commands: Collection<string, any>;

    constructor(opts) {
        super(opts);
        this.commands = new Collection();
    }
}

export type IExtendedClient = ExtendedClient;

export default function createClient(): ExtendedClient {
    // create a new Discord client
    const client = new ExtendedClient({
        http: { api: 'https://discord.com/api' },
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessageReactions,
        ],
        partials: ['MESSAGE', 'REACTION', 'CHANNEL'],
    });

    client.on('warn', console.warn);

    return client;
}
