import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '@/discord/dialog';
import { findOrCreate, GuildUserInfo } from '@/db';
import { ClusterableCommand } from '../types';
import { GuildMember } from 'discord.js';
import { areWeInChannel } from '@/discord/commands/music/util';
import {
    clusterToBase,
    hydrateCommandPayload,
} from '@/discord/commands/payload';

const command: ClusterableCommand = {
    name: 'skip',
    builder: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song')
        .setDMPermission(false),
    async buildPayload(ctx, evData) {
        return {
            member: (<GuildMember>evData.member).id,
            guild: evData.guild.id,
        };
    },
    async canExecute(ctx, payload) {
        const { member } = await hydrateCommandPayload(ctx.client, payload);
        return areWeInChannel(payload.guild, member.voice.channel.id);
    },
    async validate(ctx, interaction) {
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
    async execute(interaction, minPayload) {
        const payload = await clusterToBase(interaction.client, minPayload);
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
