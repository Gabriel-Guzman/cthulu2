import {
    findOrCreate,
    GuildUserInfo,
    IGuildUserInfo,
    IServerInfo,
    ServerInfo,
} from '@/db';
import { HydratedDocument } from 'mongoose';
import {
    APIGuildMember,
    BaseInteraction,
    CommandInteraction,
    Guild,
    GuildMember,
    InteractionType,
} from 'discord.js';
import { MotherContext } from '@/discord';

async function handleCommands(
    ctx: InteractionCreateCtx,
    interaction: CommandInteraction,
): Promise<void> {
    if (!interaction.isChatInputCommand()) return;
    const simpleCommand = ctx.client.simpleCommands.get(
        interaction.commandName,
    );

    if (simpleCommand) {
        if (!(await simpleCommand.shouldAttempt(interaction))) {
            return;
        }

        await simpleCommand.execute(interaction);
        return;
    }

    const clusterableCommand = ctx.client.clusterableCommands.get(
        interaction.commandName,
    );

    if (!clusterableCommand) {
        return;
    }

    try {
        if (!(await clusterableCommand.shouldAttempt(interaction))) {
            return;
        }

        // check if we can run it
        const payload = await clusterableCommand.buildPayloadFromInteraction(
            interaction,
        );

        // const childrenCount = (await ctx.motherServer.io.fetchSockets()).length;
        // const shouldMomRunPercent = 1 / (childrenCount + 1);
        if (await clusterableCommand.canExecute(ctx, payload)) {
            await clusterableCommand.execute(ctx, payload);
        } else {
            // TODO: otherwise delegate
            await interaction.reply(`let me ask my children...`);
            const APIPayload = await clusterableCommand.buildClusterPayload(
                payload,
            );

            // get a response from some child
            const response = await ctx.motherServer.delegate(
                ctx,
                clusterableCommand.name,
                APIPayload,
            );

            if (response.success) {
                await interaction.followUp(
                    `<@${response.responder}> responded: with ${response.message}`,
                );
            }
        }
    } catch (e) {
        console.error(e);
        await interaction.channel.send({
            content: `An error has occurred. <@140312872726167552>\n\n**\`${e.message}\`**`,
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
                .join(' ')}`,
            ephemeral: true,
        });
    }
}

export type InteractionCreateCtx = {
    guildUserInfo: HydratedDocument<IGuildUserInfo>;
    serverInfo: HydratedDocument<IServerInfo>;
} & MotherContext;

interface buildCtxParams {
    member: GuildMember | APIGuildMember;
    guild: Guild;
}

async function buildCtx(
    ctx: MotherContext,
    params: buildCtxParams,
): Promise<InteractionCreateCtx> {
    const member = params.member as GuildMember;
    return {
        guildUserInfo: await findOrCreate(GuildUserInfo, {
            userId: member.id,
            guildId: params.guild.id,
        }),
        serverInfo: await findOrCreate(ServerInfo, {
            guildId: params.guild.id,
        }),
        ...ctx,
    };
}

export default async function handleInteractionCreate(
    ctx: MotherContext,
    interaction: BaseInteraction,
): Promise<void> {
    if (interaction.type !== InteractionType.ApplicationCommand) return;
    if (interaction.user.bot) return;

    const interactionCreateCtx = await buildCtx(ctx, interaction);

    await handleCommands(
        interactionCreateCtx,
        interaction as CommandInteraction,
    );
}
