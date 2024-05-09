import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '../../dialog';
import { findOrCreate, GuildUserInfo, ServerInfo } from '@/db';
// @ts-ignore
import ytdl from 'ytdl-core';
import {
    ChatInputCommandInteraction,
    GuildMember,
    InteractionType,
    VoiceChannel,
} from 'discord.js';
import { ClusterableCommand } from '../types';
import {
    buildPayload,
    voiceChannelRestriction,
} from '@/discord/commands/music/util';
import { buildChildNodeResponse } from '@/cluster/child';
import {
    APIBasePayload,
    BasePayload,
    baseToCluster,
} from '@/discord/commands/payload';

// socket io payload
interface MinimumPayload extends APIBasePayload {
    query: string;
}

interface ExecutePayload extends BasePayload {
    query: string;
}

const command: ClusterableCommand<
    ChatInputCommandInteraction,
    ExecutePayload,
    MinimumPayload
> = {
    async buildClusterPayload(
        payload: ExecutePayload,
    ): Promise<MinimumPayload> {
        return {
            ...baseToCluster(payload),
            query: payload.query,
        };
    },
    async buildExecutePayload(client, payload): Promise<ExecutePayload> {
        const guild = await client.guilds.fetch(payload.guildId);
        const member = await guild.members.fetch(payload.memberId);
        return {
            guild,
            member,
            query: payload.query,
        };
    },
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
    async canExecute(ctx, payload): Promise<boolean> {
        const { guild, member } = payload;
        return voiceChannelRestriction(guild.id, member.voice?.channel.id);
    },
    async execute(ctx, payload) {
        try {
            const audioPayload = await buildPayload(
                ctx,
                payload.query,
                payload.member.id,
            );

            const { guild, member } = payload;
            let textChannel;
            const serverInfo = await findOrCreate(ServerInfo, {
                guildId: guild.id,
            });
            if (
                serverInfo.botReservedTextChannels &&
                serverInfo.botReservedTextChannels.length
            ) {
                textChannel = await guild.channels.fetch(
                    serverInfo.botReservedTextChannels[0],
                );
            }

            for (const payload of audioPayload) {
                await AQM.queue(
                    member.voice.channel as VoiceChannel,
                    textChannel,
                    payload,
                );
            }

            const userInfo = await findOrCreate(GuildUserInfo, {
                userId: member.id,
                guildId: guild.id,
            });

            return buildChildNodeResponse(
                true,
                getAffirmativeDialog('queue', member, userInfo),
            );
        } catch (e) {
            console.error(e);
            if (e.body && e.body.error && e.body.error.status === 404) {
                return buildChildNodeResponse(false, 'not found :(');
            }
            return buildChildNodeResponse(
                false,
                'error queueing song: ' + e.message,
            );
        }
    },

    async buildPayloadFromInteraction(interaction) {
        const query = interaction.options.getString('query');
        const payload: ExecutePayload = {
            guild: interaction.guild,
            member: interaction.member as GuildMember,
            query,
        };
        return payload;
    },
    async shouldAttempt(interaction): Promise<boolean> {
        if (!(interaction.type === InteractionType.ApplicationCommand)) {
            return;
        }

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({
                content: 'Must be in a voice channel to play music',
                ephemeral: true,
            });
            return;
        }
    },
};

export default command;
