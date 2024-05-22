import { Collection, VoiceChannel, VoiceState } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { AQM, YoutubePayload } from '@/audio/aqm';
import { HydratedDocument } from 'mongoose';
import { findOrCreate, IServerInfo, ServerInfo } from '@/db';
import { Context, MotherContext } from '@/discord';
import {
    ClusterableEventHandler,
    ClusterRequestNamespace,
} from '@/cluster/types';
import {
    hydrateVoiceStatePayload,
    VoiceStateBaseMinimumPayload,
} from '@/discord/commands/payload';
import {
    areWeInChannel,
    areWeInVoice,
    isBotInChannel,
} from '@/discord/commands/music/util';

type VoiceStateHandlerParam = {
    oldState: VoiceState;
    newState: VoiceState;
};

// Behavior: When someone leaves a voice channel, leave our voice channel
// if we're alone in it.
export async function lonely(evData: VoiceStateHandlerParam): Promise<void> {
    const { oldState, newState } = evData;
    const guildId = oldState.guild.id || newState.guild.id;
    if (newState.member.user.bot) {
        return;
    }

    const voiceConnection = getVoiceConnection(guildId);
    if (!voiceConnection) {
        return;
    }

    const currentChannelId = voiceConnection.joinConfig.channelId;
    if (!currentChannelId) {
        return;
    }

    const currentChannel: VoiceChannel = (await newState.guild.channels.fetch(
        currentChannelId,
    )) as VoiceChannel;
    const membersInCurrentChannel = currentChannel.members.size;

    // if no one else is with us
    if (membersInCurrentChannel === 1) {
        // kill voice connection and queue
        await AQM.stop(guildId);
        voiceConnection.disconnect();
    }
}

type IntroPayload = {
    guild: string;
    songUrl: string;
    newChannel: string;
};

const intro: ClusterableEventHandler<
    VoiceStateHandlerParam,
    VoiceStateUpdateCtx,
    VoiceStateBaseMinimumPayload
> = {
    name: 'intro',
    async execute(ctx: VoiceStateUpdateCtx, payload): Promise<void> {
        const { guild: guildId, newChannel, member } = payload;
        const guild = await ctx.client.guilds.fetch(guildId);
        const voiceChannel = <VoiceChannel>(
            await guild.channels.fetch(newChannel)
        );
        const songUrl = ctx.serverInfo.intros.get(member);

        try {
            await AQM.playImmediatelySilent(
                voiceChannel,
                new YoutubePayload(songUrl, '', '', ''),
            );
        } catch (error) {
            console.error(error);
        }
    },
    async validate(ctx: VoiceStateUpdateCtx, evData) {
        const { oldState, newState } = evData;
        if (!newState.channel) return false;
        if (oldState.channel) return false;

        const introSongUrl = ctx.serverInfo.intros.get(newState.member.id);
        return !!introSongUrl;
    },
    async canExecute(ctx: VoiceStateUpdateCtx, payload) {
        const { newChannel } = await hydrateVoiceStatePayload(
            ctx.client,
            payload,
        );
        if (!newChannel.joinable) return false;
        if (!areWeInChannel(newChannel.guildId, newChannel.id)) {
            if (isBotInChannel(newChannel)) {
                return false;
            }
        } else {
            if (areWeInVoice(newChannel.guildId)) {
                return false;
            }
        }

        return true;
    },
    async buildPayload(ctx, evData) {
        const { newState } = evData;
        return {
            newChannel: newState.channelId,
            guild: newState.guild.id,
            member: newState.member.id,
        };
    },
};

type VoiceStateUpdateCtx = {
    serverInfo: HydratedDocument<IServerInfo>;
} & Context;

export async function buildVoiceStateUpdateCtx(
    ctx: Context,
    guildId: string,
): Promise<VoiceStateUpdateCtx> {
    return {
        serverInfo: await findOrCreate(ServerInfo, {
            guildId,
        }),
        ...ctx,
    };
}

export default async function handleVoiceStateUpdate(
    context: MotherContext,
    oldState: VoiceState,
    newState: VoiceState,
): Promise<void> {
    if (oldState.member.user.bot) return;
    const ctx: VoiceStateUpdateCtx = await buildVoiceStateUpdateCtx(
        context,
        oldState?.guild.id || newState?.guild.id,
    );
    const simpleHandlersPromise = Promise.all([lonely({ oldState, newState })]);

    const clusterableHandlers = [intro];
    const clusterableHandlersPromise = clusterableHandlers.map(
        (h) =>
            new Promise<void>(async (res) => {
                const isValid = h.validate(ctx, { oldState, newState });
                if (!isValid) return;
                const p = await h.buildPayload(ctx, {
                    oldState,
                    newState,
                });
                if (await h.canExecute(ctx, p)) {
                    await h.execute(ctx, p);
                } else {
                    await context.motherServer.delegate(
                        context,
                        ClusterRequestNamespace.VOICE_STATE_UPDATE,
                        h.name,
                        p,
                        ctx.serverInfo.guildId,
                    );
                }
                res();
            }),
    );
    await Promise.all([simpleHandlersPromise, clusterableHandlersPromise]);
}

export function getClusterableVoiceStateHandlers() {
    const handlers = new Collection<
        string,
        ClusterableEventHandler<
            VoiceStateHandlerParam,
            VoiceStateUpdateCtx,
            VoiceStateBaseMinimumPayload
        >
    >();
    handlers.set('intro', intro);
    return handlers;
}
