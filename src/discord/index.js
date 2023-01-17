import client from "./client/index.js";
import { readdirSync } from "fs";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { InteractionType } from "discord-api-types/v10";
import createClient from "./client/index.js";
import db, { cachedFindOne, GuildUserInfo, ServerInfo } from "../db/index.js";
import {
  incrementUserXp,
  xpGainCommand,
  xpGainEvent,
} from "../levels/index.js";

export default async function scoMom() {
  // connect to database
  await db();

  // create the logged in discord client instance
  const client = createClient();

  // import all our slash commands and store them in client
  const commands = await buildCommandData();
  storeCommands(client, commands);

  // send the slash commands to discord once our client is available

  client.once("ready", async () => {
    await publishCommands(client, commands);
  });

  // register events for the client
  registerEvents(client);
}

function storeCommands(client, commands) {
  commands.forEach((c) => client.commands.set(c.name, c));
}

function registerEvents(client) {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.type === "DM") return;
    try {
      if (!process.env.STAGING) {
        const userInfo = await cachedFindOne(GuildUserInfo, {
          userId: message.author.id,
          guildId: message.channel.guild.id,
        });
        await incrementUserXp(
          userInfo,
          message.author,
          message.channel,
          xpGainEvent["messageCreate"]
        );
      }
    } catch (e) {
      console.error(e);
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.user.bot) return;
    const command = client.commands.get(interaction.commandName);

    if (!command)
      return (
        interaction.reply({
          content: "This command is unavailable. *Check back later.*",
          ephemeral: true,
        }) && client.commands.delete(interaction.commandName)
      );
    try {
      // increment user xp
      const userInfo = await cachedFindOne(GuildUserInfo, {
        userId: interaction.member.id,
        guildId: interaction.guild.id,
      });
      if (command.xpGain) {
        await incrementUserXp(
          userInfo,
          interaction.member,
          interaction.channel,
          command.xpGain
        );
      }
      await command.run(client, interaction);

      // warn the user if this is an inappropriate channel
      const serverInfo = await cachedFindOne(ServerInfo, {
        guildId: interaction.guild.id,
      });
      console.log(serverInfo);
      if (
        serverInfo.botReservedTextChannels &&
        serverInfo.botReservedTextChannels.length &&
        !serverInfo.botReservedTextChannels.includes(interaction.channel.id)
      ) {
        await interaction.followUp({
          content: `By the way we use these channels for bot commands: ${serverInfo.botReservedTextChannels
            .map((c) => `<#${c}>`)
            .join(" ")}`,
          ephemeral: true,
        });
      }
    } catch (e) {
      console.log(e);
      return interaction.reply({
        content: `An error has occurred.\n\n**\`${e.message}\`**`,
      });
    }
  });
}

async function buildCommandData() {
  const commandData = [];

  const promises = readdirSync("./src/discord/commands/").map(
    async (category) => {
      const commands = readdirSync(
        `./src/discord/commands/${category}/`
      ).filter((cmd) => cmd.endsWith(".js"));

      for await (const command of commands) {
        const Command = await import(`./commands/${category}/${command}`);

        const cmdData = Command.default;
        commandData.push(cmdData);
      }
    }
  );

  await Promise.all(promises);
  return commandData;
}

async function publishCommands(client, commandData) {
  const rest = new REST({ version: "9" }).setToken(
    process.env.DISCORD_API_TOKEN
  );

  try {
    const clientId = client.application.id;

    console.log("Started refreshing Slash Commands and Context Menus...");

    await rest
      .put(Routes.applicationCommands(clientId), {
        body: commandData.map((c) => c.builder.toJSON()),
      })
      .then(() => {
        console.log("Slash Commands and Context Menus have now been deployed.");
      });
  } catch (e) {
    console.error(e);
  }
}
