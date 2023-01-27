import { Message } from "discord.js";
import {
    cachedFindOneOrUpsert,
    GuildUserInfo,
    IGuildUserInfo,
    IServerInfo,
    ServerInfo,
} from "../../db";
import { HydratedDocument } from "mongoose";
import { incrementUserXp } from "../../levels";
import config from "../../config";
import { IExtendedClient } from "../client";

async function adjustMemberXp(
    ctx: MessageCreateContext,
    message
): Promise<void> {
    if (!process.env.STAGING && !process.env.DEV) {
        await incrementUserXp(
            ctx.guildUserInfo,
            message.author,
            message.channel,
            config.levels.xpGain.events.messageCreate
        );
    }
}

type MessageCreateContext = {
    guildUserInfo?: HydratedDocument<IGuildUserInfo>;
    serverInfo?: HydratedDocument<IServerInfo>;
    isDM: boolean;
};
async function buildCtx(message: Message) {
    if (message.channel.type === "DM") {
        return {
            isDM: true,
        };
    }
    return {
        guildUserInfo: await cachedFindOneOrUpsert(GuildUserInfo, {
            guildId: message.channel.guild.id,
            userId: message.author.id,
        }),
        serverInfo: await cachedFindOneOrUpsert(ServerInfo, {
            guildId: message.guild.id,
        }),
        isDM: false,
    };
}

export default async function handleMessageCreate(
    client: IExtendedClient,
    message: Message
): Promise<void> {
    if (message.author.bot) return;
    const ctx = await buildCtx(message);
    await Promise.all([adjustMemberXp(ctx, message)]);
}
