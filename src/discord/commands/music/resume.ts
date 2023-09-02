import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '../../dialog';
import { cachedFindOneOrUpsert, GuildUserInfo } from '@/db';
import { ScoMomCommand } from '../types';
import { CommandInteraction, GuildMember } from 'discord.js';
import { voiceChannelRestriction } from '@/discord/commands/music/util';

export default {
    name: 'resume',
    builder: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Unpause the music!')
        .setDMPermission(false),
    async run(client, interaction) {
        const member = <GuildMember>interaction.member;
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

        AQM.resume(interaction.guild.id);
        const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: interaction.member.id,
            guildId: interaction.guild.id,
        });
        return interaction.reply(
            getAffirmativeDialog('resume', interaction.member, userInfo),
        );
    },
} as ScoMomCommand<CommandInteraction>;
