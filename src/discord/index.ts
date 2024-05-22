import createClient, { IExtendedClient } from './client/index';
import eventHandlers from './eventHandlers';
import db from '@/db';
import { Client } from 'discord.js';
import Commands, { clusterableCommands } from '@/discord/commands';
import {
    BaseCommand,
    ClusterableCommand,
    ScoMomCommand,
} from '@/discord/commands/types';
import BuildRedis, { ScoRedis } from '@/redis';
import config, { ClusteringRole } from '@/config';
import { buildMotherServer, ClusterMotherManager } from '@/cluster/mother';
import { buildChildClient, ChildSocketManager } from '@/cluster/child';
import { ClusterRequest, ClusterRequestNamespace } from '@/cluster/types';
import { getClusterableVoiceStateHandlers } from '@/discord/eventHandlers/voiceStateUpdate';

export type Context = {
    redis: ScoRedis;
    client: IExtendedClient;
};

export type MotherContext = {
    motherServer: ClusterMotherManager;
} & Context;

export type ChildContext = {
    childClient: ChildSocketManager;
} & Context;

export default async function scoMom(): Promise<Client> {
    // connect to database
    await db();

    const redis = await BuildRedis();

    // create the logged in discord client instance
    const client = await createClient();
    console.log('connexting to disc at ' + process.env.DISCORD_API_TOKEN);
    await client.login(process.env.DISCORD_API_TOKEN);
    console.log(
        'logged in as ' +
            client.application.name +
            ',' +
            client.user.username +
            ',' +
            client.application.description,
    );

    // import all our slash commands and store them in client
    storeCommands(client, Commands, clusterableCommands);

    if (config.clustering.role === ClusteringRole.MOTHER) {
        const context: MotherContext = {
            client,
            redis,
            motherServer: await buildMotherServer(),
        };
        registerEvents(context);
    } else {
        const childClient = await buildChildClient();
        const context: ChildContext = {
            client,
            redis,
            childClient,
        };
        registerChildEvents(context);
        childClient.reportForDuty(context.client);
    }

    return client;
}

function registerChildEvents(context: ChildContext) {
    const voiceStateHandlers = getClusterableVoiceStateHandlers();
    const client = context.client;
    context.childClient.socket.on(
        ClusterRequest.CAN_EXECUTE,
        async (payload, cb) => {
            const { name, namespace } = payload;
            let handler;
            if (namespace === ClusterRequestNamespace.COMMAND) {
                handler = client.clusterableCommands.get(name);
            } else if (
                namespace === ClusterRequestNamespace.VOICE_STATE_UPDATE
            ) {
                handler = voiceStateHandlers.get(name);
            }
            if (!handler) {
                // it like can't happen.. messages are type safe
                console.error(
                    'received can_execute request for unknown command ',
                    name,
                );
                cb('');
                return;
            }

            const can = await handler.canExecute(context, payload);
            if (can) {
                cb(client.user.id);
            } else {
                cb('');
            }
        },
    );
    context.childClient.socket.on(
        ClusterRequest.EXECUTE,
        async (payload, cb) => {
            const voiceStateHandlers = getClusterableVoiceStateHandlers();
            const { name, namespace } = payload;
            let handler;
            if (namespace === ClusterRequestNamespace.COMMAND) {
                handler = client.clusterableCommands.get(name);
            } else if (
                namespace === ClusterRequestNamespace.VOICE_STATE_UPDATE
            ) {
                handler = voiceStateHandlers.get(payload.name);
            }
            if (!handler) {
                // it like can't happen.. messages are type safe
                console.error(
                    'received execute request for unknown command ',
                    name,
                );
                cb({
                    success: false,
                    message: 'command not found',
                });
                return;
            }

            // const ep = await command.buildExecutePayload(client, payload);
            const resp = await handler.execute(context, payload);
            cb(resp);
        },
    );
}

function storeCommands(
    client: IExtendedClient,
    simpleCommands: Array<ScoMomCommand>,
    clusterableCommands: Array<ClusterableCommand>,
): void {
    console.log(
        'loaded commands: ' +
            JSON.stringify(
                (<Array<BaseCommand>>simpleCommands)
                    .concat(clusterableCommands)
                    .map((c) => c.name),
            ),
    );
    simpleCommands.forEach((c) => {
        client.simpleCommands.set(c.name, c);
    });
    clusterableCommands.forEach((c) => {
        client.clusterableCommands.set(c.name, c);
    });
}

function registerEvents(ctx: MotherContext) {
    const { client } = ctx;
    Object.keys(eventHandlers).forEach((event) => {
        client.on(event, (...params) => {
            eventHandlers[event](ctx, ...params);
        });
    });
}
