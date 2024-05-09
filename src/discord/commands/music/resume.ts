import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '../../dialog';
import { findOrCreate, GuildUserInfo } from '@/db';
import { ClusterableCommand } from '../types';
import { CommandInteraction, GuildMember } from 'discord.js';
import { voiceChannelRestriction } from '@/discord/commands/music/util';
import {
    baseToCluster,
    clusterToBase,
    interactionToBase,
} from '@/discord/commands/payload';

const command: ClusterableCommand<CommandInteraction> = {
    async buildClusterPayload(payload) {
        return baseToCluster(payload);
    },
    buildPayloadFromInteraction(interaction) {
        return interactionToBase(interaction);
    },
    buildExecutePayload(client, payload) {
        return clusterToBase(client, payload);
    },
    canExecute(client, param): Promise<boolean> {
        return Promise.resolve(false);
    },
    name: 'resume',
    builder: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Unpause the music!')
        .setDMPermission(false),
    async shouldAttempt(interaction) {
        // if (!(interaction.type === InteractionType.ApplicationCommand)) {
        //     return false;
        // }
        if (!interaction.isChatInputCommand()) {
            return;
        }
        const member = <GuildMember>interaction.member;
        if (
            !member.voice ||
            !voiceChannelRestriction(
                interaction.guildId,
                member.voice?.channel.id,
            )
        ) {
            await interaction.reply({
                content: 'NOT ALLOWED HAHA.. stick to your own voice channel',
                ephemeral: true,
            });
            return false;
        }
        return true;
    },
    async execute(ctx, interaction) {
        const member = <GuildMember>interaction.member;

        AQM.resume(interaction.guild.id);
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: member.id,
            guildId: interaction.guild.id,
        });
        return {
            success: true,
            message: getAffirmativeDialog('resume', member, userInfo),
        };
    },
};

export default command;
