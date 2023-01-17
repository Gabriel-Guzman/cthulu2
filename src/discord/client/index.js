// require the discord.js module
import Discord, { Collection } from "discord.js";

export default function createClient() {
  // create a new Discord client
  const client = new Discord.Client({
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

  client.commands = new Collection();

  return client;
}
