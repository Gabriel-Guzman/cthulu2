import { SlashCommandBuilder } from "@discordjs/builders";
import { AQM } from "@/audio";
import { getAffirmativeDialog } from "../../dialog";
import { cachedFindOneOrUpsert, GuildUserInfo, ServerInfo } from "@/db";
// @ts-ignore
import ytdl from "ytdl-core";
import { CommandInteraction, GuildMember, Interaction } from "discord.js";
import { ScoMomCommand } from "../types";
import { buildPayload } from "@/discord/commands/music/util";

export default {
    name: "queue",
    builder: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Add a song to the music queue")
        .setDMPermission(false)
        .addStringOption((opt) =>
            opt
                .setRequired(true)
                .setName("query")
                .setDescription(
                    "Query can be a youtube link, spotify link, or search query e.g. 'happy pharrell'"
                )
        ),
    async run(client, interaction: Interaction) {
        if (!interaction.isApplicationCommand()) {
            return;
        }

        if (!interaction.isCommand()) {
            return;
        }

        const query = interaction.options.getString("query");
        const member = <GuildMember>interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                content: "Must be in a voice channel to play music",
                ephemeral: true,
            });
        }

        try {
            const payload = await buildPayload(query);

            let textChannel;
            const serverInfo = await cachedFindOneOrUpsert(ServerInfo, {
                guildId: interaction.guild.id,
            });
            if (
                serverInfo.botReservedTextChannels &&
                serverInfo.botReservedTextChannels.length
            ) {
                textChannel = await interaction.guild.channels.fetch(
                    serverInfo.botReservedTextChannels[0]
                );
            }

            await AQM.queue(voiceChannel, textChannel, payload);

            const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
                userId: member.id,
                guildId: interaction.guild.id,
            });
            return interaction.reply(
                getAffirmativeDialog("queue", member, userInfo)
            );
        } catch (e) {
            console.error(e);
            if (e.body && e.body.error && e.body.error.status === 404) {
                return interaction.reply({
                    content: "not found :(",
                    ephemeral: true,
                });
            }
            return interaction.reply({
                content: "error queueing song: " + e.message,
                ephemeral: true,
            });
        }
    },
} as ScoMomCommand<CommandInteraction>;
