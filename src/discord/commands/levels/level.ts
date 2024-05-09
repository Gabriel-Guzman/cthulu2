import { SlashCommandBuilder } from '@discordjs/builders';
import { findOrCreate, GuildUserInfo } from '@/db';
import { calculateLevel, calculateXp } from '@/levels';
import { CommandInteraction, GuildMember } from 'discord.js';
import { ScoMomCommand } from '../types';

const command: ScoMomCommand = {
    name: 'level',
    builder: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Display your current SCO level and XP')
        .setDMPermission(false),
    async shouldAttempt() {
        return true;
    },
    async execute(interaction: CommandInteraction): Promise<void> {
        const member = interaction.member as GuildMember;

        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: member.id,
            guildId: interaction.guild.id,
        });

        const level = calculateLevel(userInfo.xp);
        const xpToNextLevel = Math.ceil(calculateXp(level + 1)) - userInfo.xp;
        await interaction.reply(
            `You're currently level ${level} with ${userInfo.xp} xp and ${xpToNextLevel} xp to next level`,
        );
    },
};

export default command;
