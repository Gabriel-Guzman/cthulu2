import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { IExtendedClient } from '@/discord/client';
import { APIBasePayload, BasePayload } from '@/discord/commands/payload';
import { Context } from '@/discord';

export interface BaseCommand {
    name: string;
    builder:
        | SlashCommandBuilder
        | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

    // return true if the interaction meets the criteria to run this command.
    // returning false means the command will not be executed or delegated.
    shouldAttempt(interaction: CommandInteraction): Promise<boolean>;
}

export interface ScoMomCommand extends BaseCommand {
    execute(interaction: CommandInteraction): Promise<void>;
}

export type ChildNodeResponse = {
    success: boolean;
    message: string;
};

export interface ClusterableCommand<
    InteractionType extends CommandInteraction = CommandInteraction,
    ExecutePayload extends BasePayload = BasePayload,
    MinimumPayload extends APIBasePayload = APIBasePayload,
> extends BaseCommand {
    buildPayloadFromInteraction(
        interaction: InteractionType,
    ): Promise<ExecutePayload> | ExecutePayload;

    buildClusterPayload(
        payload: ExecutePayload,
    ): Promise<MinimumPayload> | MinimumPayload;

    buildExecutePayload(
        client: IExtendedClient,
        payload: MinimumPayload,
    ): Promise<ExecutePayload> | ExecutePayload;

    // Core executionof the command
    execute(ctx: Context, param: ExecutePayload): Promise<ChildNodeResponse>;

    // Return true if this particular node is able to execute the command.
    // Returning false means the other nodes will be interrogated and potentially
    // run the command.
    canExecute(client: Context, param: ExecutePayload): Promise<boolean>;
}

// export interface SchoChildCommand
