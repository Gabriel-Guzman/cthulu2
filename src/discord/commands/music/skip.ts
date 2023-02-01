import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '@/discord/dialog';
import { cachedFindOneOrUpsert, GuildUserInfo } from '@/db';
import { ScoMomCommand } from '../types';
import { CommandInteraction } from 'discord.js';

export default {
    name: 'skip',
    builder: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song')
        .setDMPermission(false),
    async run(client, interaction) {
        AQM.skip(interaction.guild.id);
        const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: interaction.member.id,
            guildId: interaction.guild.id,
        });
        return interaction.reply(
            getAffirmativeDialog('skip', interaction.member, userInfo)
        );
    },
} as ScoMomCommand<CommandInteraction>;
