import { SlashCommandBuilder } from '@discordjs/builders';
import { ClusterableCommand, ClusterableCommandResponse } from '../types';
import { CommandInteraction, GuildMember } from 'discord.js';
import { findOrCreate, GuildUserInfo } from '@/db';
import { AQM } from '@/audio/aqm';
import { buildChildNodeResponse } from '@/cluster/child';
import { getAffirmativeDialog } from '@/discord/dialog';
import { areWeInChannel, isUserInVoice } from '@/discord/commands/music/util';
import { hydrateCommandPayload } from '@/discord/commands/payload';

const command: ClusterableCommand = {
    async buildPayload(ctx, evData) {
        return {
            guild: evData.guild.id,
            member: (<GuildMember>evData.member).id,
        };
    },
    async canExecute(ctx, param): Promise<boolean> {
        const { member } = await hydrateCommandPayload(ctx.client, param);
        return (
            isUserInVoice(member) &&
            areWeInChannel(param.guild, member.voice.channel.id)
        );
    },
    async execute(ctx, param): Promise<ClusterableCommandResponse> {
        AQM.pause(param.guild);
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: param.member,
            guildId: param.guild,
        });
        const { member } = await hydrateCommandPayload(ctx.client, param);
        return buildChildNodeResponse(
            true,
            getAffirmativeDialog('pause', member, userInfo),
        );
    },
    async validate(ctx, interaction: CommandInteraction): Promise<boolean> {
        const member = <GuildMember>interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply({
                content: 'Must be in a voice channel to issue this command',
                ephemeral: true,
            });
            return false;
        }
        return true;
    },
    name: 'pause',
    builder: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the music')
        .setDMPermission(false),
};

export default command;
