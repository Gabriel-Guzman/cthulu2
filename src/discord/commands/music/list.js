import { SlashCommandBuilder } from "@discordjs/builders";
import { AQM } from "../../../audio/index.js";
import { getAffirmativeDialog } from "../../dialog/index.js";
import { cachedFindOne, GuildUserInfo } from "../../../db/index.js";

export default {
  name: "list",
  builder: new SlashCommandBuilder()
    .setName("list")
    .setDescription("List the current songs in the queue."),
  async run(client, interaction) {
    const queue = AQM.getQueue(interaction.guild.id);

    const fields = queue.map((song) => ({}));

    const userInfo = await cachedFindOne(GuildUserInfo, {
      userId: interaction.member.id,
      guildId: interaction.guild.id,
    });
    await interaction.reply(
      getAffirmativeDialog("list", interaction.member, userInfo)
    );
  },
};
