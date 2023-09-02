import { EmbedBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { AQM, IAudioPayload, UnsoughtYoutubePayload } from '@/audio/aqm';
import { getAffirmativeDialog } from '@/discord/dialog';
import { cachedFindOneOrUpsert, GuildUserInfo } from '@/db';
import { ScoMomCommand } from '../types';
import { CommandInteraction, GuildMember } from 'discord.js';
import { IExtendedClient } from '@/discord/client';
import chunk from 'lodash/chunk';
import pagination from '@/discord/util/pagination';
import { voiceChannelRestriction } from '@/discord/commands/music/util';

export default {
    name: 'list',
    builder: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Lists the songs in the queue')
        .setDMPermission(false),
    async run(
        client: IExtendedClient,
        interaction: CommandInteraction,
    ): Promise<void> {
        const member = interaction.member as GuildMember;
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
        const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: (interaction.member as GuildMember).id,
            guildId: interaction.guild.id,
        });

        const reply = getAffirmativeDialog(
            'list',
            interaction.member as GuildMember,
            userInfo,
        );

        const gq = AQM.queues.get(interaction.guild.id);

        const list = await Promise.all(
            AQM.list(interaction.guild.id).map(async (a) => {
                if (a instanceof UnsoughtYoutubePayload) {
                    return a.toYoutubePayload();
                }
                return a;
            }),
        );

        const chunks = chunk(list, 10);

        const pages = chunks.map((tracks) => {
            const SongsDescription = tracks
                .map((t: IAudioPayload, index) => {
                    return `\`${
                        index + 1
                    }.\` [${t.getTitle()}](${t.getLink()}) \n\ requested by: ${
                        t.requestedBy
                    }\n`;
                })
                .join('\n');

            const embed = new EmbedBuilder()
                // .setAuthor('Queue', client.application.iconURL())
                .setAuthor({
                    name: 'Queue',
                    iconURL: client.application.iconURL(),
                })
                .setDescription(
                    `**currently playing:** \n[${gq
                        .nowPlaying()
                        .getTitle()}](${gq
                        .nowPlaying()
                        .getLink()}) \n\n**up next:** \n${SongsDescription}\n\n`,
                )
                .addFields({
                    name: 'queue length: ',
                    value: (gq.payloads.length - 1).toString(),
                });

            return embed;
        });

        if (!pages.length || pages.length === 1) {
            gq.textChannel.send(pages[0]);
            return;
        }
        await pagination(interaction, pages, client);
    },
} as ScoMomCommand<CommandInteraction>;
