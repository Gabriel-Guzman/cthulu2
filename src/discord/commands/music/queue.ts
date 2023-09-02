import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '../../dialog';
import { cachedFindOneOrUpsert, GuildUserInfo, ServerInfo } from '@/db';
// @ts-ignore
import ytdl from 'ytdl-core';
import {
    BaseInteraction,
    CommandInteraction,
    GuildMember,
    InteractionType,
    VoiceChannel,
} from 'discord.js';
import { ScoMomCommand } from '../types';
import {
    buildPayload,
    voiceChannelRestriction,
} from '@/discord/commands/music/util';

export default {
    name: 'queue',
    builder: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Add a song to the music queue')
        .setDMPermission(false)
        .addStringOption((opt) =>
            opt
                .setRequired(true)
                .setName('query')
                .setDescription(
                    "Query can be a youtube link, spotify link, or search query e.g. 'happy pharrell'",
                ),
        ),
    async run(client, interaction: BaseInteraction): Promise<void> {
        if (!(interaction.type === InteractionType.ApplicationCommand)) {
            return;
        }

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const query = interaction.options.getString('query');
        const member = <GuildMember>interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({
                content: 'Must be in a voice channel to play music',
                ephemeral: true,
            });
            return;
        }

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
            return;
        }

        try {
            const payload = await buildPayload(query, member.id);

            let textChannel;
            const serverInfo = await cachedFindOneOrUpsert(ServerInfo, {
                guildId: interaction.guild.id,
            });
            if (
                serverInfo.botReservedTextChannels &&
                serverInfo.botReservedTextChannels.length
            ) {
                textChannel = await interaction.guild.channels.fetch(
                    serverInfo.botReservedTextChannels[0],
                );
            }

            await AQM.queue(voiceChannel as VoiceChannel, textChannel, payload);

            const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
                userId: member.id,
                guildId: interaction.guild.id,
            });
            await interaction.reply(
                getAffirmativeDialog('queue', member, userInfo),
            );
            return;
        } catch (e) {
            console.error(e);
            if (e.body && e.body.error && e.body.error.status === 404) {
                await interaction.reply({
                    content: 'not found :(',
                    ephemeral: true,
                });
                return;
            }
            await interaction.reply({
                content: 'error queueing song: ' + e.message,
            });
            return;
        }
    },
} as ScoMomCommand<CommandInteraction>;
