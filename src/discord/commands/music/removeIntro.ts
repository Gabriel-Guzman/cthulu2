import { SlashCommandBuilder } from '@discordjs/builders';
import { getAffirmativeDialog } from '@/discord/dialog';
import { findOrCreate, GuildUserInfo, ServerInfo } from '@/db';
// @ts-ignore
import ytdl from 'ytdl-core';
import { ScoMomCommand } from '../types';
import {
    CommandInteraction,
    GuildMember,
    Interaction,
    InteractionType,
} from 'discord.js';

export default {
    name: 'remove intro',
    builder: new SlashCommandBuilder()
        .setName('remove-intro')
        .setDescription('Remove your intro music. Cannot be undone.')
        .setDMPermission(false),
    async execute(client, interaction: Interaction) {
        if (
            !interaction.isChatInputCommand() ||
            !(interaction.type === InteractionType.ApplicationCommand)
        ) {
            return;
        }
        const member = <GuildMember>interaction.member;

        const serverInfo = await findOrCreate(ServerInfo, {
            guildId: interaction.guild.id,
        });
        if (serverInfo.intros) {
            serverInfo.intros.delete(member.id);
        }

        await serverInfo.save();
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: member.id,
            guildId: interaction.guild.id,
        });
        await interaction.reply(
            getAffirmativeDialog('removeIntro', member, userInfo),
        );
    },
} as ScoMomCommand<CommandInteraction>;
