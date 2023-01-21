// require the discord.js module
import { Client, Collection, Intents } from "discord.js";

class ExtendedClient extends Client {
    constructor(opts) {
        super(opts);
        this.commands = new Collection();
    }
    commands: Collection<string, any>;
}

export interface IExtendedClient extends ExtendedClient {}

export default function createClient(): ExtendedClient {
    // create a new Discord client
    const client = new ExtendedClient({
        http: { api: "https://discord.com/api" },
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.DIRECT_MESSAGES,
            Intents.FLAGS.GUILD_MEMBERS,
            Intents.FLAGS.GUILD_VOICE_STATES,
            Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        ],
        partials: ["MESSAGE", "REACTION", "CHANNEL"],
    });

    client.on("warn", console.warn);

    return client;
}
