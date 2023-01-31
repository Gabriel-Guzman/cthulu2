import createClient, { IExtendedClient } from "./client/index";
import eventHandlers from "./eventHandlers";
import db from "@/db";
import { Client } from "discord.js";
import Commands from "@/discord/commands";
import { ScoMomCommand } from "@/discord/commands/types";

export default async function scoMom(): Promise<Client> {
    // connect to database
    await db();

    // create the logged in discord client instance
    const client = createClient();
    await client.login(process.env.DISCORD_API_TOKEN);
    console.log(
        "logged in as " +
            client.application.name +
            "," +
            client.user.username +
            "," +
            client.application.description
    );

    // import all our slash commands and store them in client
    storeCommands(client, Commands);

    // register events for the client
    registerEvents(client);
    return client;
}

function storeCommands(
    client: IExtendedClient,
    commands: Array<ScoMomCommand<any, any>>
): void {
    console.log(
        "loaded commands: " + JSON.stringify(commands.map((c) => c.name))
    );
    commands.forEach((c) => client.commands.set(c.name, c));
}

function registerEvents(client: IExtendedClient) {
    Object.keys(eventHandlers).forEach((event) => {
        client.on(event, (...params) =>
            eventHandlers[event](client, ...params)
        );
    });
}
