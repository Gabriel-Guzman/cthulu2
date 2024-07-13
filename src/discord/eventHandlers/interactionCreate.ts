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
import { ClusterRequestNamespace } from '@/cluster/types';

async function handleCommands(
    ctx: InteractionCreateCtx,
    interaction: CommandInteraction,
): Promise<void> {
    console.debug('handling commands');
    if (!interaction.isChatInputCommand()) return;
    const simpleCommand = ctx.client.simpleCommands.get(
        interaction.commandName,
    );

    if (simpleCommand) {
        console.debug('found simple command', simpleCommand.name);
        if (!(await simpleCommand.validate(ctx, interaction))) {
            return;
        }

        await simpleCommand.execute(interaction);
        return;
    }

    const clusterableCommand = ctx.client.clusterableCommands.get(
        interaction.commandName,
    );

    if (!clusterableCommand) {
        console.debug('found no command', simpleCommand.name);
        return;
    }

    try {
        if (!(await clusterableCommand.validate(ctx, interaction))) {
            console.debug('should not attempt', clusterableCommand.name);
            return;
        }

        // check if we can run it
        const payload = await clusterableCommand.buildPayload(ctx, interaction);

        if (await clusterableCommand.canExecute(ctx, payload)) {
            console.debug(
                'executing clusterable command as leader',
                clusterableCommand.name,
                payload,
            );
            const resp = await clusterableCommand.execute(ctx, payload);
            await interaction.reply(resp.message);
        } else {
            await interaction.reply(`let me ask my children...`);

            // get a response from some child
            const response = await ctx.motherIO.delegate(
                ctx,
                ClusterRequestNamespace.COMMAND,
                clusterableCommand.name,
                payload,
                interaction.guildId,
            );
            console.debug('received response from children', response);

            if (response.success) {
                await interaction.followUp(
                    `<@${response.responder}> responded: ${response.message}`,
                );
            } else {
                await interaction.followUp(
                    response.responder
                        ? `oh no.. <@${response.responder}> says: ${response.message}`
                        : `couldnt delegate task. error: ${response.message}`,
                );
            }
        }
    } catch (e) {
        console.error(e);
        await interaction.channel.send({
            content: `An error has occurred. \n\n**\`${e.message}\`**`,
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
