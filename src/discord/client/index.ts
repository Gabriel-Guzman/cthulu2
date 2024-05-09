// require the discord.js module
import {
    Client,
    ClientOptions,
    Collection,
    GatewayIntentBits,
    Partials,
} from 'discord.js';
import { ClusterableCommand, ScoMomCommand } from '@/discord/commands/types';

class ExtendedClient extends Client {
    simpleCommands: Collection<string, ScoMomCommand>;
    clusterableCommands: Collection<string, ClusterableCommand>;

    constructor(opts: ClientOptions) {
        super(opts);
        this.simpleCommands = new Collection();
        this.clusterableCommands = new Collection();
    }
}

// export class MotherClient extends ExtendedClient {
//     clusterMother: ClusterMotherManager;
//     constructor(opts, server: ClusterMotherManager, redis: RedisClientType) {
//         super(opts, redis);
//         this.clusterMother = server;
//     }
// }
//
// export class ChildClient extends ExtendedClient {
//     clusterMother: false;
//     childSocketManager: ChildSocketManager;
//     constructor(opts, childSocketManager: ChildSocketManager) {
//         super(opts);
//         this.clusterMother = false;
//         this.childSocketManager = childSocketManager;
//     }
// }

export type IExtendedClient = ExtendedClient;

export default async function createClient(): Promise<IExtendedClient> {
    const discordOpts = {
        http: { api: 'https://discord.com/api' },
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessageReactions,
        ],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    };

    // create a new Discord client
    const client: IExtendedClient = new ExtendedClient(discordOpts);

    // @ts-ignore
    client.on('warn', console.warn);

    return client;
}
