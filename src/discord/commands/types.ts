import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { CommandBaseMinimumPayload } from '@/discord/commands/payload';
import {
    ClusterableEventHandler,
    ClusterableEventHandlerResponse,
} from '@/cluster/types';
import { Context } from '@/discord';
import { BaseEventHandler } from '@/discord/eventHandlers/types';

export interface BaseCommand extends BaseEventHandler {
    builder:
        | SlashCommandBuilder
        | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
}

export interface ScoMomCommand extends BaseCommand {
    validate(
        ctx: Context,
        evData: ChatInputCommandInteraction,
    ): Promise<boolean>;

    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export type ClusterableCommand<
    Payload extends CommandBaseMinimumPayload = CommandBaseMinimumPayload,
> = ClusterableEventHandler<
    ChatInputCommandInteraction,
    Context,
    Payload,
    ClusterableEventHandlerResponse
> &
    BaseCommand;
