import { IExtendedClient } from '../client';
import { VoiceChannel, VoiceState } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { AQM, YoutubePayload } from '@/audio/aqm';
import { HydratedDocument } from 'mongoose';
import { findOrCreate, IServerInfo, ServerInfo } from '@/db';

export async function lonely(
    oldState: VoiceState,
    newState: VoiceState,
): Promise<void> {
    const voiceChannelId = newState.channelId;
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

export async function intro(
    ctx: VoiceStateUpdateCtx,
    oldState: VoiceState,
    newState: VoiceState,
): Promise<void> {
    if (!newState.channel) return;
    if (oldState.channel) return;

    const voiceChannel = newState.channel;
    if (!voiceChannel.joinable) return;

    const memberId = newState.member.id;

    const introSongUrl = ctx.serverInfo.intros.get(memberId);
    if (!introSongUrl) return;

    try {
        await AQM.playImmediatelySilent(
            voiceChannel,
            new YoutubePayload(introSongUrl, '', '', ''),
        );
    } catch (error) {
        console.error(error);
    }
}

type VoiceStateUpdateCtx = {
    serverInfo: HydratedDocument<IServerInfo>;
};

export default async function handleVoiceStateUpdate(
    client: IExtendedClient,
    oldState: VoiceState,
    newState: VoiceState,
): Promise<void> {
    if (oldState.member.user.bot) return;
    const ctx: VoiceStateUpdateCtx = {
        serverInfo: await findOrCreate(ServerInfo, {
            guildId: newState.guild?.id || oldState.guild?.id,
        }),
    };
    await Promise.all([
        lonely(oldState, newState),
        intro(ctx, oldState, newState),
    ]);
}
