import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '../../dialog';
import { cachedFindOneOrUpsert, GuildUserInfo } from '@/db';
import { ScoMomCommand } from '../types';
import { CommandInteraction } from 'discord.js';

export default {
    name: 'stop',
    builder: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music.. you sure?')
        .setDMPermission(false),
    async run(client, interaction) {
        AQM.stop(interaction.guild.id);
        const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: interaction.member.id,
            guildId: interaction.guild.id,
        });
        return interaction.reply(
            getAffirmativeDialog('stop', interaction.member, userInfo),
        );
    },
} as ScoMomCommand<CommandInteraction>;
