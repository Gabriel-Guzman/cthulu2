import { SlashCommandBuilder } from "@discordjs/builders";
import { AQM } from "../../../audio";
import { getAffirmativeDialog } from "../../dialog";
import { cachedFindOneOrUpsert, GuildUserInfo, ServerInfo } from "../../../db";
// @ts-ignore
import ytdl from "ytdl-core";
import { ScoMomCommand } from "../types";
import { CommandInteraction } from "discord.js";

function isValidHttpUrl(string): boolean {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}

async function isRealYoutubeUrl(string): Promise<boolean> {
    if (!isValidHttpUrl(string)) return false;

    try {
        const songInfo = await ytdl.getInfo(
            string.replace("https://", "http://")
        );
        if (songInfo) return true;
        return false;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export default {
    name: "intro",
    builder: new SlashCommandBuilder()
        .setName("intro")
        .setDescription(
            "Accepts a youtube link. Choose your intro music! (please keep it short)"
        )
        .setDMPermission(false)
        .addStringOption((opt) =>
            opt
                .setName("link")
                .setDescription("the youtube link to play when you join voice")
                .setRequired(true)
        ),
    async run(client, interaction) {
        const url = interaction.options.getString("link");
        const serverInfo = await cachedFindOneOrUpsert(ServerInfo, {
            guildId: interaction.guild.id,
        });
        if (!serverInfo.intros) {
            serverInfo.intros = new Map();
        }
        if (!(await isRealYoutubeUrl(url))) {
            return interaction.reply("i don't think that's a valid link...");
        }
        serverInfo.intros.set(interaction.member.id, url);
        await serverInfo.save();
        const userInfo = await cachedFindOneOrUpsert(GuildUserInfo, {
            userId: interaction.member.id,
            guildId: interaction.guild.id,
        });
        return interaction.reply(
            getAffirmativeDialog("intro", interaction.member, userInfo)
        );
    },
} as ScoMomCommand<CommandInteraction>;
