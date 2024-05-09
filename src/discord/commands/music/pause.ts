import { SlashCommandBuilder } from '@discordjs/builders';
import { ChildNodeResponse, ClusterableCommand } from '../types';
import { CommandInteraction, GuildMember } from 'discord.js';
import { findOrCreate, GuildUserInfo } from '@/db';
import { AQM } from '@/audio/aqm';
import { buildChildNodeResponse } from '@/cluster/child';
import { getAffirmativeDialog } from '@/discord/dialog';
import { voiceChannelRestriction } from '@/discord/commands/music/util';
import { baseToCluster, interactionToBase } from '@/discord/commands/payload';

const command: ClusterableCommand = {
    buildClusterPayload(payload) {
        return baseToCluster(payload);
    },
    async buildPayloadFromInteraction(interaction: CommandInteraction) {
        return interactionToBase(interaction);
    },
    async buildExecutePayload(client, payload) {
        const guild = await client.guilds.fetch(payload.guildId);
        const member = await guild.members.fetch(payload.memberId);
        return {
            guild,
            member,
        };
    },
    async canExecute(client, param): Promise<boolean> {
        return voiceChannelRestriction(
            param.guild.id,
            param.member.voice?.channel.id,
        );
    },
    async execute(client, param): Promise<ChildNodeResponse> {
        AQM.pause(param.guild.id);
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: param.member.id,
            guildId: param.guild.id,
        });
        return buildChildNodeResponse(
            true,
            getAffirmativeDialog('pause', param.member, userInfo),
        );
    },
    async shouldAttempt(interaction: CommandInteraction): Promise<boolean> {
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
