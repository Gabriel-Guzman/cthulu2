import createClient, { IExtendedClient } from './client/index';
import eventHandlers from './eventHandlers';
import db from '@/db';
import {
    ChatInputCommandInteraction,
    Client,
    Events,
    VoiceState,
} from 'discord.js';
import Commands, { clusterableCommands } from '@/discord/commands';
import {
    BaseCommand,
    ClusterableCommand,
    ScoMomCommand,
} from '@/discord/commands/types';
import BuildRedis, { ScoRedis } from '@/redis';
import config, { ClusteringRole } from '@/config';
import { ClusterMotherIO, createMotherIO } from '@/cluster/mother';
import { buildChildIO, ClusterChildIO } from '@/cluster/child';
import {
    APIExecutePayload,
    ClusterableCommandResponse,
    ClusterableEventHandler,
    ClusterRequest,
    ClusterRequestNamespace,
} from '@/cluster/types';
import {
    getClusterableVoiceStateHandlers,
    globalSimpleHandlers,
    VoiceStateHandlerParam,
} from '@/discord/eventHandlers/voiceStateUpdate';
import {
    CommandBaseMinimumPayload,
    VoiceStateBaseMinimumPayload,
} from '@/discord/commands/payload';

export type Context = {
    redis: ScoRedis;
    client: IExtendedClient;
};

export type MotherContext = {
    motherIO: ClusterMotherIO;
} & Context;

export type ChildContext = {
    childIO: ClusterChildIO;
} & Context;

export default async function scoMom(): Promise<Client> {
    // connect to database
    await db();

    const redis = await BuildRedis();

    // create the logged in discord client instance
    const client = await createClient();
    console.log('connecting to disc at ' + process.env.DISCORD_API_TOKEN);
    await client.login(process.env.DISCORD_API_TOKEN);
    console.log('logged in as ' + client.user.username);

    // store commands in client
    storeCommands(client, Commands, clusterableCommands);

    if (config.clustering.role === ClusteringRole.MOTHER) {
        const context: MotherContext = {
            client,
            redis,
            motherIO: await createMotherIO(),
        };
        registerEvents(context);
    } else {
        // can take long to connect to the mother. will retry without timeout
        // until connection is successful.
        const childClient = await buildChildIO();
        const context: ChildContext = {
            client,
            redis,
            childIO: childClient,
        };
        registerChildEvents(context);
        childClient.reportForDuty(context.client);
    }

    return client;
}

async function getHandler(
    context: ChildContext,
    payload: APIExecutePayload,
): Promise<
    ClusterableEventHandler<
        VoiceStateHandlerParam | ChatInputCommandInteraction,
        Context,
        VoiceStateBaseMinimumPayload | CommandBaseMinimumPayload,
        ClusterableCommandResponse | void
    >
> {
    const { name, namespace } = payload;
    const { client } = context;
    const voiceStateHandlers = getClusterableVoiceStateHandlers();
    let handler: ClusterableEventHandler<
        VoiceStateHandlerParam | ChatInputCommandInteraction,
        Context,
        VoiceStateBaseMinimumPayload | CommandBaseMinimumPayload,
        ClusterableCommandResponse | void
    >;
    if (namespace === ClusterRequestNamespace.COMMAND) {
        handler = client.clusterableCommands.get(name);
    } else if (namespace === ClusterRequestNamespace.VOICE_STATE_UPDATE) {
        handler = voiceStateHandlers.get(name);
    }
    if (!handler) {
        // it like can't happen.. messages are type safe
        console.error(
            'received can_execute request for unknown command ',
            name,
        );
        return;
    }
    return handler;
}

function registerChildEvents(context: ChildContext) {
    const voiceStateHandlers = getClusterableVoiceStateHandlers();
    const client = context.client;
    context.client.on(
        Events.VoiceStateUpdate,
        async (oldState: VoiceState, newState: VoiceState) => {
            for (const handler of globalSimpleHandlers) {
                await handler({ oldState, newState });
            }
        },
    );

    context.childIO.socket.on(
        ClusterRequest.CAN_EXECUTE,
        async (payload, cb) => {
            const handler = await getHandler(context, payload);
            const { name } = payload;
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
    context.childIO.socket.on(ClusterRequest.EXECUTE, async (payload, cb) => {
        // const voiceStateHandlers = getClusterableVoiceStateHandlers();
        const { name, namespace } = payload;
        // let handler: ClusterableEventHandler<
        //     VoiceStateHandlerParam | ChatInputCommandInteraction,
        //     Context,
        //     VoiceStateBaseMinimumPayload | CommandBaseMinimumPayload,
        //     ClusterableCommandResponse | void
        // >;
        // if (namespace === ClusterRequestNamespace.COMMAND) {
        //     handler = client.clusterableCommands.get(name);
        // } else if (namespace === ClusterRequestNamespace.VOICE_STATE_UPDATE) {
        //     handler = voiceStateHandlers.get(payload.name);
        // }
        const handler = await getHandler(context, payload);
        if (!handler) {
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

        const timerLabel = `child executing ${namespace}.${name} with ${JSON.stringify(
            payload,
        )}`;
        console.time(timerLabel);
        const resp = await handler.execute(context, payload);
        console.timeEnd(timerLabel);
        cb(resp || { success: true, message: '' });
    });
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
            console.time(`event handler ${event}`);
            eventHandlers[event](ctx, ...params);
            console.timeEnd(`event handler ${event}`);
        });
    });
}
