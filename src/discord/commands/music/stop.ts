import { SlashCommandBuilder } from '@discordjs/builders';
import { ClusterableCommand } from '../types';
import { CommandInteraction, GuildMember } from 'discord.js';
import { baseToCluster, clusterToBase } from '@/discord/commands/payload';
import { voiceChannelRestriction } from '@/discord/commands/music/util';
import { findOrCreate, GuildUserInfo } from '@/db';
import { getAffirmativeDialog } from '@/discord/dialog';
import { AQM } from '@/audio/aqm';
import { buildChildNodeResponse } from '@/cluster/child';

const command: ClusterableCommand<CommandInteraction> = {
    async buildClusterPayload(payload) {
        return baseToCluster(payload);
    },
    async buildPayloadFromInteraction(interaction: CommandInteraction) {
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
    async execute(client, param) {
        AQM.stop(param.guild.id);
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: param.member.id,
            guildId: param.guild.id,
        });
        return buildChildNodeResponse(
            true,
            getAffirmativeDialog('stop', param.member, userInfo),
        );
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
    name: 'stop',
    builder: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music.. you sure?')
        .setDMPermission(false),
    // async run(client, interaction) {
    //     const member = interaction.member as GuildMember;
    //     if (
    //         !member.voice ||
    //         !voiceChannelRestriction(
    //             interaction.guildId,
    //             member.voice?.channel.id,
    //         )
    //     ) {
    //         await interaction.reply({
    //             content: 'NOT ALLOWED HAHA.. stick to your own voice channel',
    //             ephemeral: true,
    //         });
    //         return;
    //     }
    //
    //     AQM.stop(interaction.guild.id);
    //     const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
    //         userId: member.id,
    //         guildId: interaction.guild.id,
    //     });
    //     return interaction.reply(
    //         getAffirmativeDialog('stop', member, userInfo),
    //     );
    // },
};

export default command;
