import { SlashCommandBuilder } from '@discordjs/builders';
import { AQM } from '@/audio/aqm';
import { getAffirmativeDialog } from '../../dialog';
import { findOrCreate, GuildUserInfo, ServerInfo } from '@/db';
import { GuildMember, VoiceChannel } from 'discord.js';
import { ClusterableCommand } from '../types';
import {
    areWeInChannel,
    areWeInVoice,
    buildPayload,
    isBotInChannel,
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
        const { member } = await hydrateCommandPayload(ctx.client, payload);
        if (!member.voice.channel.joinable) return false;
        const channel = member.voice.channel;
        if (!areWeInChannel(channel.guildId, channel.id)) {
            if (isBotInChannel(channel, ctx.client.user.id)) {
                console.debug('cant join channel because a bot is in it');
                return false;
            }
            if (areWeInVoice(channel.guildId)) {
                console.debug(
                    'cant join channel because im in a different one',
                );
                return false;
            }
        }
        return true;
    },
    async execute(ctx, payload) {
        const { member, guild } = await hydrateCommandPayload(
            ctx.client,
            payload,
        );
        try {
            const audioPayloads = await buildPayload(
                ctx,
                payload.query,
                payload.member,
            );

            const serverInfo = await findOrCreate(ServerInfo, {
                guildId: payload.guild,
            });

            // look for which channel we're allowed to spam
            let textChannel;
            if (
                serverInfo.botReservedTextChannels &&
                serverInfo.botReservedTextChannels.length
            ) {
                textChannel = await guild.channels.fetch(
                    serverInfo.botReservedTextChannels[0],
                );
            }

            for (const payload of audioPayloads) {
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
