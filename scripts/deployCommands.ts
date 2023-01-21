import { IExtendedClient } from "../src/discord/client";
import { ApplicationCommand } from "discord.js";

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const { config } = require("dotenv");
const { buildCommandData } = require("../src/discord");
const createClient = require("../src/discord/client");

async function publishCommands() {
    const commandData = await buildCommandData();
    const client: IExtendedClient = await createClient.default();
    await client.login();
    const rest = new REST({ version: "9" }).setToken(
        process.env.DISCORD_API_TOKEN
    );

    rest.on("rateLimited", (...events) =>
        console.log("RATE LIMITED", ...events)
    );

    try {
        const clientId = client.application.id;

        console.log("Started refreshing Slash Commands and Context Menus...");

        console.log("deploying " + commandData.map((c) => c.name));

        await rest
            .put(Routes.applicationCommands(clientId), {
                body: commandData.map((c) => c.builder.toJSON()),
            })
            .then(() => {
                console.log(
                    "Slash Commands and Context Menus have now been deployed."
                );
            });

        console.log("confirmed the following: ");
        const newCommands = client.application.commands;
        const actualCommands = await newCommands.fetch();
        const cached = actualCommands.entries();
        let x: ApplicationCommand;
        while ((x = cached.next().value)) {
            console.log(x[1].name);
            console.log(x[1]);
        }
    } catch (e) {
        console.error(e);
    }
}

config();
publishCommands().then(console.log).catch(console.error);
