import {
    cachedFindOneOrUpsert,
    GuildUserInfo,
    IGuildUserInfo,
    IServerInfo,
    ServerInfo,
} from "../../db";
import { HydratedDocument } from "mongoose";
import {
    BaseCommandInteraction,
    Client,
    CommandInteraction,
    GuildMember,
    Interaction,
} from "discord.js";
import { IExtendedClient } from "../client";
import { incrementUserXp } from "../../levels";

async function handleCommands(
    ctx: InteractionCreateCtx,
    interaction: CommandInteraction
): Promise<void> {
    const command = ctx.client.commands.get(interaction.commandName);
    if (!command) {
        await interaction.reply({
            content: "This command is unavailable. *Check back later.*",
            ephemeral: true,
        });
        ctx.client.commands.delete(interaction.commandName);
        return;
    }

    if (command.xpGain) {
        await incrementUserXp(
            ctx.guildUserInfo,
            interaction.member as GuildMember,
            interaction.channel,
            command.xpGain
        );
    }

    try {
        await command.run(ctx.client, interaction);
    } catch (e) {
        await interaction.reply({
            content: `An error has occurred.\n\n**\`${e.message}\`**`,
        });
        return;
    }

    const serverInfo = ctx.serverInfo;
    // warn the user if this is an inappropriate channel
    if (
        serverInfo.botReservedTextChannels &&
        serverInfo.botReservedTextChannels.length &&
        !serverInfo.botReservedTextChannels.includes(interaction.channel.id)
    ) {
        await interaction.followUp({
            content: `By the way we use these channels for bot commands: ${serverInfo.botReservedTextChannels
                .map((c) => `<#${c}>`)
                .join(" ")}`,
            ephemeral: true,
        });
    }
}

type InteractionCreateCtx = {
    guildUserInfo: HydratedDocument<IGuildUserInfo>;
    serverInfo: HydratedDocument<IServerInfo>;
    client: IExtendedClient;
};

async function buildCtx(
    client: IExtendedClient,
    interaction: CommandInteraction
): Promise<InteractionCreateCtx> {
    const member = interaction.member as GuildMember;
    return {
        guildUserInfo: await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: member.id,
            guildId: interaction.guild.id,
        }),
        serverInfo: await cachedFindOneOrUpsert(ServerInfo, {
            guildId: interaction.guild.id,
        }),
        client,
    };
}

export default async function handleInteractionCreate(
    client: IExtendedClient,
    interaction: Interaction
): Promise<void> {
    if (interaction.type !== "APPLICATION_COMMAND") return;
    interaction = interaction as CommandInteraction;
    if (interaction.user.bot) return;

    const ctx = await buildCtx(client, interaction as CommandInteraction);

    await handleCommands(ctx, interaction as CommandInteraction);
}
