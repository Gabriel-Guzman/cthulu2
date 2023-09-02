import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '../../dialog';
import { cachedFindOneOrUpsert, GuildUserInfo } from '@/db';
import { ScoMomCommand } from '../types';
import { CommandInteraction, GuildMember } from 'discord.js';

export default {
    name: 'pause',
    builder: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the music')
        .setDMPermission(false),
    async run(client, interaction) {
        const member = <GuildMember>interaction.member;
        if (
            AQM.getChannelId(interaction.guildId) !== member.voice?.channel.id
        ) {
            await interaction.reply({
                content: 'NOT ALLOWED HAHA.. stick to your own voice channel',
                ephemeral: true,
            });
            return;
        }
        AQM.pause(interaction.guild.id);
        const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: interaction.member.id,
            guildId: interaction.guild.id,
        });

        return interaction.reply(
            getAffirmativeDialog('pause', interaction.member, userInfo),
        );
    },
} as ScoMomCommand<CommandInteraction>;
