import { IExtendedClient } from '@/discord/client';
import { ApplicationCommand } from 'discord.js';

import { REST } from '@discordjs/rest';

import { Routes } from 'discord-api-types/v10';

import { config } from 'dotenv';
import commands from '../src/discord/commands';

import createClient from '../src/discord/client';

import appCfg from 'ecosystem.config';

async function publishCommands(apiKey: string) {
    const commandData = commands;
    const client: IExtendedClient = await createClient();
    await client.login(apiKey);
    const rest = new REST({ version: '9' }).setToken(apiKey);

    rest.on('rateLimited', (...events) =>
        console.log('RATE LIMITED', ...events),
    );

    try {
        const clientId = client.application.id;

        console.log('Started refreshing Slash Commands and Context Menus...');
        console.log('deploying ' + commandData.map((c) => c.name));

        await rest
            .put(Routes.applicationCommands(clientId), {
                body: commandData.map((c) => c.builder.toJSON()),
            })
            .then(() => {
                console.log(
                    'Slash Commands and Context Menus have now been deployed.',
                );
            });

        console.log('confirmed the following: ');
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
Promise.all(
    appCfg.apps.map(async (app) => {
        if (app.env_production.ROLE === 'MOTHER')
            publishCommands(app.env_production.DISCORD_API_TOKEN).then(() =>
                console.log('commands published for ', app.name),
            );
        else {
            const rest = new REST({ version: '9' }).setToken(
                app.env_production.DISCORD_API_TOKEN,
            );

            rest.on('rateLimited', (...events) =>
                console.log('RATE LIMITED', ...events),
            );
            const client: IExtendedClient = await createClient();
            await client.login(app.env_production.DISCORD_API_TOKEN);
            await rest.put(
                // @ts-ignore-next-line
                Routes.applicationCommands(client.application.id, { body: [] }),
            );
        }
    }),
)
    .then(console.log)
    .catch(console.error);
