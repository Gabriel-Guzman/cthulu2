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

export type VoiceStateHandlerParam = {
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

const intro: ClusterableEventHandler<
    VoiceStateHandlerParam,
    Context,
    VoiceStateBaseMinimumPayload
> = {
    name: 'intro',
    async execute(ctx, payload): Promise<void> {
        const { guild: guildId, newChannel, member } = payload;
        const guild = await ctx.client.guilds.fetch(guildId);
        const voiceChannel = <VoiceChannel>(
            await guild.channels.fetch(newChannel)
        );

        const serverInfo = await findOrCreate(ServerInfo, {
            guildId: payload.guild,
        });
        const songUrl = serverInfo.intros.get(member);

        let textChannel;
        if (
            serverInfo.botReservedTextChannels &&
            serverInfo.botReservedTextChannels.length
        ) {
            textChannel = await guild.channels.fetch(
                serverInfo.botReservedTextChannels[0],
            );
        }

        try {
            await AQM.playImmediatelySilent(
                voiceChannel,
                textChannel,
                new YoutubePayload(songUrl, '', '', ''),
            );
        } catch (error) {
            console.error(error);
        }
    },
    async validate(ctx, evData) {
        const { oldState, newState } = evData;
        if (!newState.channel?.id) return false;
        if (oldState?.channel?.id) return false;

        const serverInfo = await findOrCreate(ServerInfo, {
            guildId: newState.guild.id,
        });
        const introSongUrl = serverInfo.intros.get(newState.member.id);
        return !!introSongUrl;
    },
    async canExecute(ctx, payload) {
        const { newChannel, oldChannel } = await hydrateVoiceStatePayload(
            ctx.client,
            payload,
        );
        if (oldChannel && oldChannel.id) return false;
        if (!newChannel) {
            console.error('invalid payload in vsu canExecute');
            return false;
        }
        if (!newChannel.joinable) {
            console.error('channel is not joinable');
            return false;
        }
        if (!areWeInChannel(newChannel.guildId, newChannel.id)) {
            if (isBotInChannel(newChannel, ctx.client.user.id)) {
                console.error('cant join channel because a bot is in it');
                return false;
            }
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

export const globalSimpleHandlers = [lonely];

export default async function handleVoiceStateUpdate(
    context: MotherContext,
    oldState: VoiceState,
    newState: VoiceState,
): Promise<void> {
    if (oldState.member.user.bot) return;
    const ctx = context;
    const simpleHandlersPromise = Promise.all(
        globalSimpleHandlers.map((h) => h({ oldState, newState })),
    );

    const clusterableHandlers = [intro];
    const clusterableHandlersPromise = clusterableHandlers.map(
        (h) =>
            new Promise<void>(async (res) => {
                const isValid = await h.validate(ctx, { oldState, newState });
                if (!isValid) return;
                const p = await h.buildPayload(ctx, {
                    oldState,
                    newState,
                });
                if (await h.canExecute(ctx, p)) {
                    await h.execute(ctx, p);
                } else {
                    await context.motherIO.delegate(
                        context,
                        ClusterRequestNamespace.VOICE_STATE_UPDATE,
                        h.name,
                        p,
                        oldState?.guild.id || newState.guild?.id,
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
