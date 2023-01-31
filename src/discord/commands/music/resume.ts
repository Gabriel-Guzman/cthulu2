import { SlashCommandBuilder } from "@discordjs/builders";
import { AQM } from "@/audio";
import { getAffirmativeDialog } from "../../dialog";
import { cachedFindOneOrUpsert, GuildUserInfo } from "@/db";
import { ScoMomCommand } from "../types";
import { CommandInteraction } from "discord.js";

export default {
    name: "resume",
    builder: new SlashCommandBuilder()
        .setName("resume")
        .setDescription("Unpause the music!")
        .setDMPermission(false),
    async run(client, interaction) {
        AQM.resume(interaction.guild.id);
        const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: interaction.member.id,
            guildId: interaction.guild.id,
        });
        return interaction.reply(
            getAffirmativeDialog("resume", interaction.member, userInfo)
        );
    },
} as ScoMomCommand<CommandInteraction>;
