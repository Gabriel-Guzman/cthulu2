import {
    Guild,
    GuildMember, SendableChannels,
    TextBasedChannel,
    VoiceBasedChannel,
} from 'discord.js';
import { IExtendedClient } from '@/discord/client';

// Conserves keys and changes values to strings
// to be filled with IDs.
export type ToIds<T> = {
    [K in keyof T]: string;
};

export type CommandBaseMinimumPayload = ToIds<CommandBasePayload>;
export type CommandBasePayload = {
    guild: Guild;
    member: GuildMember;
    channel?: SendableChannels;
};

export type VoiceStateBaseMinimumPayload = ToIds<VoiceStateBasePayload>;
export type VoiceStateBasePayload = {
    guild: Guild;
    member: GuildMember;
    oldChannel?: VoiceBasedChannel;
    newChannel?: VoiceBasedChannel;
};

export async function hydrateVoiceStatePayload(
    client: IExtendedClient,
    payload: Partial<VoiceStateBaseMinimumPayload>,
): Promise<Partial<VoiceStateBasePayload>> {
    const guild = await client.guilds.fetch(payload.guild);
    let member: GuildMember;
    if (!guild) throw new Error('Invalid guild id ' + payload.guild);
    if (payload.member) {
        member = await guild.members.fetch(payload.member);
    }

    const getChannel = (channelId: string) => {
        return guild.channels.fetch(channelId);
    };

    return {
        guild,
        member,
        oldChannel: payload.oldChannel
            ? <VoiceBasedChannel>await getChannel(payload.oldChannel)
            : undefined,
        newChannel: payload.newChannel
            ? <VoiceBasedChannel>await getChannel(payload.newChannel)
            : undefined,
    };
}

export async function hydrateCommandPayload(
    client: IExtendedClient,
    payload: Partial<CommandBaseMinimumPayload>,
): Promise<Partial<CommandBasePayload>> {
    let guild: Guild | undefined;
    let member: GuildMember | undefined;
    let channel: SendableChannels | undefined;
    if (payload.guild) {
        guild = await client.guilds.fetch(payload.guild);
        if (!guild) throw new Error('Invalid guild id');

        if (payload.member) {
            member = await guild.members.fetch(payload.member);
        }

        if (payload.channel) {
            channel = <SendableChannels>(
                await guild.channels.fetch(payload.channel)
            );
        }
    }

    return {
        guild,
        member,
        channel,
    };
}
