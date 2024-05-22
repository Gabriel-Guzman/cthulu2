import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '../../dialog';
import { findOrCreate, GuildUserInfo, ServerInfo } from '@/db';
// @ts-ignore
import ytdl from 'ytdl-core';
import { GuildMember, VoiceChannel } from 'discord.js';
import { ClusterableCommand } from '../types';
import {
    areWeInChannel,
    buildPayload,
    isBotInChannel,
    isUserInVoice,
} from '@/discord/commands/music/util';
import { buildChildNodeResponse } from '@/cluster/child';
import {
    CommandBaseMinimumPayload,
    hydrateCommandPayload,
} from '@/discord/commands/payload';

// socket io payload
interface MinimumPayload extends CommandBaseMinimumPayload {
    query: string;
}

const command: ClusterableCommand<MinimumPayload> = {
    async buildPayload(ctx, evData) {
        return {
            query: evData.options.getString('query'),
            guild: evData.guild.id,
            member: (<GuildMember>evData.member).id,
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
        const { member, guild } = await hydrateCommandPayload(
            ctx.client,
            payload,
        );
        if (!isUserInVoice(member)) return false;
        if (!member.voice.channel.joinable) return false;
        const me = await guild.members.fetch(ctx.client.user);
        if (isUserInVoice(me)) {
            return areWeInChannel(guild.id, member.voice.channelId);
        } else {
            return !isBotInChannel(member.voice.channel);
        }
    },
    async execute(ctx, payload) {
        const { member, guild } = await hydrateCommandPayload(
            ctx.client,
            payload,
        );
        try {
            const audioPayload = await buildPayload(
                ctx,
                payload.query,
                payload.member,
            );

            let textChannel;
            const serverInfo = await findOrCreate(ServerInfo, {
                guildId: payload.guild,
            });

            // if there's a channel for bot to spam in this guild
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

    async validate(ctx, interaction): Promise<boolean> {
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({
                content: 'Must be in a voice channel to play music',
                ephemeral: true,
            });
            return false;
        }
        return true;
    },
};

export default command;
