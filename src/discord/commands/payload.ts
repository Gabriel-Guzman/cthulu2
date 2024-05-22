import {
    Guild,
    GuildMember,
    TextBasedChannel,
    VoiceBasedChannel,
} from 'discord.js';
import { IExtendedClient } from '@/discord/client';

// Cumulative Payload. All possible fields for a minimum payload.
export type ToIds<T> = {
    [K in keyof T]: string;
};

export type CommandBaseMinimumPayload = ToIds<CommandBasePayload>;
export type CommandBasePayload = {
    guild: Guild;
    member: GuildMember;
    channel?: TextBasedChannel;
};

export type VoiceStateBaseMinimumPayload = ToIds<VoiceStateBasePayload>;
export type VoiceStateBasePayload = {
    guild: Guild;
    member: GuildMember;
    oldChannel?: VoiceBasedChannel;
    newChannel?: VoiceBasedChannel;
};

export async function interactionToBase(interaction) {
    return {
        guild: interaction.guild,
        member: interaction.member as GuildMember,
    };
}

export async function hydrateVoiceStatePayload(
    client: IExtendedClient,
    payload: Partial<ToIds<VoiceStateBaseMinimumPayload>>,
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
    let channel: TextBasedChannel | undefined;
    if (payload.guild) {
        guild = await client.guilds.fetch(payload.guild);
        if (!guild) throw new Error('Invalid guild id');

        if (payload.member) {
            member = await guild.members.fetch(payload.member);
        }

        if (payload.channel) {
            channel = <TextBasedChannel>(
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

export async function clusterToBase(
    client: IExtendedClient,
    payload: CommandBaseMinimumPayload,
): Promise<CommandBasePayload> {
    const guild = await client.guilds.fetch(payload.guild);
    const member = await guild.members.fetch(payload.member);
    return { guild, member };
}

export function baseToCluster(
    payload: CommandBasePayload,
): CommandBaseMinimumPayload {
    return { guild: payload.guild.id, member: payload.member.id };
}
