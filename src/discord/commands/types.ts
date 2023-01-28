import {
    SharedSlashCommandOptions,
    SlashCommandBuilder,
} from "@discordjs/builders";
import { Client, Message } from "discord.js";
import { IExtendedClient } from "../client";

export type DelegableOptions = {};

export type DelegableScoMomCommand<T, J = void> = {
    delegable(opts: DelegableOptions): void;
} & ScoMomCommand<T, J>;

export type ScoMomCommand<T, J = void> = {
    name: string;
    builder:
        | Omit<
              SharedSlashCommandOptions,
              "addSubcommand" | "addSubcommandGroup"
          >
        | SharedSlashCommandOptions;
    run(client: IExtendedClient, param: T): Promise<void>;
    run(client: IExtendedClient, ...params: [T, J]): Promise<void>;
};
