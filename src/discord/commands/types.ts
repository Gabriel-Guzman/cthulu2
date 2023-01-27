import { SlashCommandBuilder } from "@discordjs/builders";
import { Client, Message } from "discord.js";

export interface ScoMomCommand<T, J = void> {
    name: string;
    builder: SlashCommandBuilder;
    run(client: Client, param: T): Promise<void>;
    run(client: Client, params: [T, J]): Promise<void>;
}
