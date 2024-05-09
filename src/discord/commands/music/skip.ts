import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '@/discord/dialog';
import { findOrCreate, GuildUserInfo } from '@/db';
import { ClusterableCommand } from '../types';
import { GuildMember } from 'discord.js';
import { voiceChannelRestriction } from '@/discord/commands/music/util';
import { baseToCluster, clusterToBase } from '@/discord/commands/payload';

const command: ClusterableCommand = {
    name: 'skip',
    builder: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song')
        .setDMPermission(false),
    async buildClusterPayload(payload) {
        return baseToCluster(payload);
    },
    async buildPayloadFromInteraction(interaction) {
        return {
            guild: interaction.guild,
            member: interaction.member as GuildMember,
        };
    },
    async buildExecutePayload(client, payload) {
        return clusterToBase(client, payload);
    },
    async canExecute(client, payload): Promise<boolean> {
        return voiceChannelRestriction(payload.guild.id, payload.member.id);
    },
    async shouldAttempt(interaction) {
        const member = <GuildMember>interaction.member;
        if (!member.voice?.channel) {
            await interaction.reply({
                content: 'you MUST be in a voice channel to control music',
                ephemeral: true,
            });
            return false;
        }

        return true;
    },
    async execute(interaction, payload) {
        AQM.skip(payload.guild.id);
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: (payload.member as GuildMember).id,
            guildId: payload.guild.id,
        });
        return {
            success: true,
            message: getAffirmativeDialog(
                'skip',
                payload.member as GuildMember,
                userInfo,
            ),
        };
    },
};

export default command;
