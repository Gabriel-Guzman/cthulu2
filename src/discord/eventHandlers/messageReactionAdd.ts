import { MessageReaction, User } from "discord.js";
import {
    cachedFindOneOrUpsert,
    GuildUserInfo,
    IGuildUserInfo,
    IServerInfo,
    ServerInfo,
} from "@/db";
import { HydratedDocument } from "mongoose";
import { IExtendedClient } from "../client";

async function acceptRules(
    ctx: MessageReactionAddCtx,
    reaction: MessageReaction,
    user: User
): Promise<void> {
    const { rulesMessage, beforeAcceptRole, afterAcceptRole } =
        ctx.serverInfo.acceptRules;
    if (reaction.message.id === rulesMessage) {
        const guildUser = reaction.message.guild.members.resolve(user.id);
        if (!(await guildUser.roles.resolve(afterAcceptRole))) {
            await guildUser.roles.remove(beforeAcceptRole);
            await guildUser.roles.add(afterAcceptRole);

            console.log("accepted rules!");
        }

        await reaction.remove();
    }
}

type MessageReactionAddCtx = {
    guildUserInfo?: HydratedDocument<IGuildUserInfo>;
    serverInfo?: HydratedDocument<IServerInfo>;
    isDM: boolean;
};

async function buildCtx(reaction: MessageReaction, user: User) {
    if (reaction.message.channel.type === "DM") {
        return { isDM: true };
    }
    return {
        guildUserInfo: await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: (await reaction.message.guild.members.fetch(user)).id,
            guildId: reaction.message.channel.guild.id,
        }),
        serverInfo: await cachedFindOneOrUpsert(ServerInfo, {
            guildId: reaction.message.guild.id,
        }),
        isDM: false,
    };
}

export default async function handleMessageReactionAdd(
    client: IExtendedClient,
    reaction: MessageReaction,
    user: User
): Promise<void> {
    if (user.bot) return;
    if (reaction.me) return;
    if (!reaction.message.guild) return;

    const ctx = await buildCtx(reaction, user);
    await Promise.all([acceptRules(ctx, reaction, user)]);
}
