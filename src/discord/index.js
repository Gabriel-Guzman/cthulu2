import { readdirSync } from "fs";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import createClient from "./client/index";
import eventHandlers from "./eventHandlers";
import db from "../db";

export default async function scoMom() {
    // connect to database
    await db();

    // create the logged in discord client instance
    const client = createClient();
    await client.login();

    // import all our slash commands and store them in client
    const commands = await buildCommandData();
    storeCommands(client, commands);

    // register events for the client
    registerEvents(client);
}

function storeCommands(client, commands) {
    console.log(
        "loaded commands: " + JSON.stringify(commands.map((c) => c.name))
    );
    commands.forEach((c) => client.commands.set(c.name, c));
}

function registerEvents(client) {
    Object.keys(eventHandlers).forEach((event) => {
        client.on(event, (...params) =>
            eventHandlers[event](client, ...params)
        );
    });
}

export async function buildCommandData() {
    const commandData = [];

    const absoluteCommandsPath = process.env.NODE_DEV
        ? process.env.PWD + "/src/discord/commands"
        : process.env.PWD + "/dist/src/discord/commands";

    const promises = readdirSync(absoluteCommandsPath).map(async (category) => {
        const commands = readdirSync(
            `${absoluteCommandsPath}/${category}/`
        ).filter(
            (cmd) =>
                // @ts-ignore
                console.log(absoluteCommandsPath, cmd) ||
                cmd.endsWith(".ts") ||
                cmd.endsWith(".js")
        );

        for await (const command of commands) {
            const Command = await import(`./commands/${category}/${command}`);

            const cmdData = Command.default;
            commandData.push(cmdData);
        }
    });

    await Promise.all(promises);
    return commandData;
}
