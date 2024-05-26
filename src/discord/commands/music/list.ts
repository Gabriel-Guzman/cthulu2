import { EmbedBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { ClusterableCommand } from '../types';
import { GuildMember } from 'discord.js';
import { areWeInChannel, isUserInVoice } from '@/discord/commands/music/util';
import { findOrCreate, GuildUserInfo } from '@/db';
import pagination from '@/discord/util/pagination';
import {
    AQM,
    IAudioPayload,
    UnsoughtYoutubePayload,
    YoutubePayload,
} from '@/audio/aqm';
import { getAffirmativeDialog } from '@/discord/dialog';
import { hydrateCommandPayload } from '@/discord/commands/payload';
import chunk from 'lodash/chunk';
import { buildChildNodeResponse } from '@/cluster/child';

const command: ClusterableCommand = {
    name: 'list',
    builder: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Lists the songs in the queue')
        .setDMPermission(false),
    async validate(ctx, interaction) {
        return isUserInVoice(interaction.member as GuildMember);
    },

    async buildPayload(ctx, interaction) {
        return {
            member: (<GuildMember>interaction.member).id,
            guild: interaction.guild.id,
            channel: interaction.channel.id,
        };
    },

    async canExecute(context, payload) {
        const { member } = await hydrateCommandPayload(context.client, payload);
        return areWeInChannel(payload.guild, member.voice?.channel.id);
    },

    async execute(context, payload) {
        const { member, channel } = await hydrateCommandPayload(
            context.client,
            payload,
        );
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: (member as GuildMember).id,
            guildId: payload.guild,
        });

        const gq = AQM.queues.get(payload.guild);

        const youtubePayloadPromises = AQM.list(payload.guild).map(
            async (a) => {
                if (a instanceof UnsoughtYoutubePayload) {
                    return a.toYoutubePayload();
                }
                return a;
            },
        );

        // load unsought youtube data for embeds
        const list = await Promise.all(youtubePayloadPromises);

        const chunks: YoutubePayload[][] = chunk(list, 5);

        const pages: EmbedBuilder[] = await Promise.all(
            chunks.map(async (tracks) => {
                const SongsDescription = tracks
                    .map((t: IAudioPayload, index) => {
                        return `\`${
                            index + 1
                        }.\` [${t.getTitle()}](${t.getLink()}) \n\ requested by: <@${
                            t.requestedBy
                        }>\n`;
                    })
                    .join('\n');

                return (
                    new EmbedBuilder()
                        // .setAuthor('Queue', client.application.iconURL())
                        .setAuthor({
                            name: 'queue',
                            iconURL: context.client.application.iconURL(),
                        })
                        .setDescription(
                            `**currently playing:** \n[${await gq
                                .nowPlaying()
                                .getTitle()}](${await gq
                                .nowPlaying()
                                .getLink()}) \n\n**up next:** \n${SongsDescription}\n\n`,
                        )
                        .addFields({
                            name: 'queue length: ',
                            value: gq.payloads.length.toString(),
                        })
                );
            }),
        );

        const reply = getAffirmativeDialog(
            'list',
            member as GuildMember,
            userInfo,
        );
        if (pages.length === 1) {
            await channel.send({
                embeds: [pages[0]],
            });
            return buildChildNodeResponse(true, reply);
        } else if (!pages.length) {
            await channel.send('queue is empty silly silly child.');
            return buildChildNodeResponse(true, reply);
        }
        await pagination(channel, member, pages, context.client);
        return buildChildNodeResponse(true, reply);
    },
};

export default command;
