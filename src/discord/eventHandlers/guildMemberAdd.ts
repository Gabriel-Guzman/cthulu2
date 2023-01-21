import { GuildMember } from "discord.js";
import {
    cachedFindOneOrUpsert,
    GuildUserInfo,
    IGuildUserInfo,
    IServerInfo,
    ServerInfo,
} from "../../db";
import { HydratedDocument } from "mongoose";
import { IExtendedClient } from "../client";

async function initRoles(
    ctx: GuildMemberAddContext,
    member: GuildMember
): Promise<void> {
    const acceptRules = ctx.serverInfo.acceptRules;
    if (acceptRules && member.moderatable) {
        await member.roles.add(acceptRules.beforeAcceptRole);
    }
}

type GuildMemberAddContext = {
    guildUserInfo: HydratedDocument<IGuildUserInfo>;
    serverInfo: HydratedDocument<IServerInfo>;
};

async function buildCtx(member: GuildMember): Promise<GuildMemberAddContext> {
    return {
        guildUserInfo: await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: member.id,
            guildId: member.guild.id,
        }),
        serverInfo: await cachedFindOneOrUpsert(ServerInfo, {
            guildId: member.guild.id,
        }),
    };
}

export default async function handleGuildMemberAdd(
    client: IExtendedClient,
    member: GuildMember
) {
    if (member.user.bot) return;
    const ctx = await buildCtx(member);
    await Promise.all([initRoles(ctx, member)]);
}
