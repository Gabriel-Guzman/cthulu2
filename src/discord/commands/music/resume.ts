import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '../../dialog';
import { findOrCreate, GuildUserInfo } from '@/db';
import { ClusterableCommand } from '../types';
import { GuildMember } from 'discord.js';
import { areWeInChannel, isUserInVoice } from '@/discord/commands/music/util';
import { hydrateCommandPayload } from '@/discord/commands/payload';

const command: ClusterableCommand = {
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
    name: 'resume',
    builder: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Unpause the music!')
        .setDMPermission(false),
    async validate(ctx, interaction) {
        const member = <GuildMember>interaction.member;
        if (!isUserInVoice(member)) {
            await interaction.reply({
                content: 'gotta be in a voice channel for that bud',
                ephemeral: true,
            });
            return false;
        }
        return true;
    },
    async execute(ctx, payload) {
        const { member } = await hydrateCommandPayload(ctx.client, payload);

        AQM.resume(payload.guild);
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: member.id,
            guildId: payload.guild,
        });
        return {
            success: true,
            message: getAffirmativeDialog('resume', member, userInfo),
        };
    },
};

export default command;
