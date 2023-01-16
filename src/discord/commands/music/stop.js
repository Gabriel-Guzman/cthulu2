import { SlashCommandBuilder } from "@discordjs/builders";
import { AQM } from "../../../audio/index.js";
import { getAffirmativeDialog } from "../../dialog/index.js";
import { cachedFindOne, GuildUserInfo } from "../../../db/index.js";

export default {
  name: "stop",
  builder: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop the music.. you sure?"),
  async run(client, interaction) {
    AQM.stop(interaction.guild.id);
    const userInfo = await cachedFindOne(GuildUserInfo, { userId: interaction.member.id, guildId: interaction.guild.id });
    return interaction.reply(
      getAffirmativeDialog("stop", interaction.member, userInfo)
    );
  }
}
