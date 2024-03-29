import { SlashCommandBuilder } from '@discordjs/builders';
import { cachedFindOneOrUpsert, GuildUserInfo } from '@/db';
import { calculateLevel, calculateXp } from '@/levels';
import { CommandInteraction, GuildMember } from 'discord.js';
import { ScoMomCommand } from '../types';

export default {
    name: 'level',
    builder: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Display your current SCO level and XP')
        .setDMPermission(false),
    async run(client, interaction: CommandInteraction): Promise<void> {
        const member = interaction.member as GuildMember;

        const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: member.id,
            guildId: interaction.guild.id,
        });

        const level = calculateLevel(userInfo.xp);
        const xpToNextLevel = Math.ceil(calculateXp(level + 1)) - userInfo.xp;
        await interaction.reply(
            `You're currently level ${level} with ${userInfo.xp} xp and ${xpToNextLevel} xp to next level`,
        );
    },
} as ScoMomCommand<CommandInteraction>;
