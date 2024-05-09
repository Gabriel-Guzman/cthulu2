import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '@/discord/dialog';
import { findOrCreate, GuildUserInfo } from '@/db';
import { ScoMomCommand } from '../types';
import { CommandInteraction, GuildMember } from 'discord.js';
import { voiceChannelRestriction } from '@/discord/commands/music/util';

export default {
    name: 'skip',
    builder: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song')
        .setDMPermission(false),
    async execute(client, interaction: CommandInteraction) {
        const member = interaction.member as GuildMember;
        if (
            !member.voice ||
            !voiceChannelRestriction(
                interaction.guildId,
                member.voice?.channel.id,
            )
        ) {
            await interaction.reply({
                content: 'NOT ALLOWED HAHA.. stick to your own voice channel',
                ephemeral: true,
            });
            return;
        }

        AQM.skip(interaction.guild.id);
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: (interaction.member as GuildMember).id,
            guildId: interaction.guild.id,
        });
        await interaction.reply(
            getAffirmativeDialog(
                'skip',
                interaction.member as GuildMember,
                userInfo,
            ),
        );
    },
} as ScoMomCommand<CommandInteraction>;
