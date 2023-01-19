// require the discord.js module
import Discord, { Collection } from "discord.js";

class ExtendedClient extends Discord.Client {
  constructor(opts) {
    super(opts);
    this.commands = new Collection();
  }
  commands: Collection<string, any>;
}

export default function createClient(): ExtendedClient {
  // create a new Discord client
  const client = new ExtendedClient({
    http: { api: "https://discord.com/api" },
    intents: [
      Discord.Intents.FLAGS.GUILDS,
      Discord.Intents.FLAGS.GUILD_MESSAGES,
      Discord.Intents.FLAGS.DIRECT_MESSAGES,
      Discord.Intents.FLAGS.GUILD_MEMBERS,
      Discord.Intents.FLAGS.GUILD_VOICE_STATES,
      Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    ],
    partials: ["MESSAGE", "REACTION", "CHANNEL"],
  });

  client.on("warn", console.warn);

  // login to Discord

  client
    .login(process.env.DISCORD_API_TOKEN)
    .then((p) => console.log("Logged into Discord"));

  return client;
}
