import { Guild, GuildMember } from 'discord.js';
import { IExtendedClient } from '@/discord/client';

export type APIBasePayload = {
    guildId: string;
    memberId: string;
};

export type BasePayload = {
    guild: Guild;
    member: GuildMember;
};

export async function interactionToBase(interaction) {
    return {
        guild: interaction.guild,
        member: interaction.member as GuildMember,
    };
}

export async function clusterToBase(
    client: IExtendedClient,
    payload: APIBasePayload,
): Promise<BasePayload> {
    const guild = await client.guilds.fetch(payload.guildId);
    const member = await guild.members.fetch(payload.memberId);
    return { guild, member };
}

export function baseToCluster(payload: BasePayload): APIBasePayload {
    return { guildId: payload.guild.id, memberId: payload.member.id };
}
