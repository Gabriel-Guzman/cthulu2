import { SlashCommandBuilder } from '@discordjs/builders';
import { ClusterableCommand } from '../types';
import { GuildMember } from 'discord.js';
import { hydrateCommandPayload } from '@/discord/commands/payload';
import { areWeInChannel } from '@/discord/commands/music/util';
import { findOrCreate, GuildUserInfo } from '@/db';
import { getAffirmativeDialog } from '@/discord/dialog';
import { AQM } from '@/audio/aqm';
import { buildChildNodeResponse } from '@/cluster/child';

const command: ClusterableCommand = {
    async buildPayload(ctx, evData) {
        return {
            guild: evData.guild.id,
            member: (<GuildMember>evData.member).id,
        };
    },
    async canExecute(ctx, param): Promise<boolean> {
        const { member } = await hydrateCommandPayload(ctx.client, param);
        return areWeInChannel(param.guild, member.voice.channel.id);
    },
    async execute(client, param) {
        await AQM.stop(param.guild);
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: param.member,
            guildId: param.guild,
        });
        const { member } = await hydrateCommandPayload(client.client, param);
        return buildChildNodeResponse(
            true,
            getAffirmativeDialog('stop', member, userInfo),
        );
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
    name: 'stop',
    builder: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music.. you sure?')
        .setDMPermission(false),
};

export default command;
