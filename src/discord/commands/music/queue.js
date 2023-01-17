import { SlashCommandBuilder } from "@discordjs/builders";
import { parse } from "spotify-uri";
import { AQM, Search, YouTubeAudio, UnsearchedYoutubePayload} from "../../../audio/index.js";
import { getAffirmativeDialog } from "../../dialog/index.js";
import Spotify, { confirmCredentials } from "../../spotify/index.js";
import { cachedFindOne, GuildUserInfo, ServerInfo } from "../../../db/index.js";

export default {
  name: "queue",
  builder: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Add a song to the music queue")
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setRequired(true)
        .setName("query")
        .setDescription("Query can be a youtube link, spotify link, or search query e.g. 'happy pharrell'")
    ),
  async run(client, interaction) {
    const query = interaction.options.getString("query");
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: "Must be in a voice channel to play music", ephemeral: true});
    }

    try {
      const payload = await buildPayload(query)

      let textChannel;
      const serverInfo = await cachedFindOne(ServerInfo, { guildId: interaction.guild.id });
      if (serverInfo.botReservedTextChannels && serverInfo.botReservedTextChannels.length) {
        textChannel = await interaction.guild.channels.fetch(serverInfo.botReservedTextChannels[0]);
      }

      await AQM.queue(voiceChannel, textChannel, payload);

      const userInfo = await cachedFindOne(GuildUserInfo, { userId: interaction.member.id, guildId: interaction.guild.id });
      return interaction.reply(
        getAffirmativeDialog("queue", interaction.member, userInfo)
      );
    }
    catch (e) {
      if (e.body && e.body.error && e.body.error.status === 404) {
        return interaction.reply({ content: "not found :(", ephemeral: true });
      }

      return interaction.reply({ content: "error queueing song: " + e.message, ephemeral: true });
    }

  }
}

async function buildPayload(query) {
  const firstWord = query.trim().split(" ")[0];
  const fullArgs = query;

  const parsed = parseSpotifyUri(firstWord);

  let ytPayload;

  if (parsed) {
    await confirmCredentials(Spotify);

    switch (parsed.type) {
      case "track":
        const resp = await Spotify.getTrack(parsed.id);

        const track = resp.body;
        const name = track.name;
        const artists = track.artists.map((a) => a.name);
        const result = await Search.searchVideos(
          name + " " + artists.join(" ")
        );
        if (!result || result.length === 0) {
          throw new Error("i couldn't find that on youtube :(");
        }
        return new YouTubeAudio(result[0].link, result[0].title);
      case "playlist":
        const playlistResp = await Spotify.getPlaylist(parsed.id);

        const playlist = playlistResp.body;
        const queries = playlist.tracks.items.map(
          (item) =>
            item.track.name +
            " " +
            item.track.artists.map((a) => a.name).join(" ")
        );
        return queries.map((q) => new UnsearchedYoutubePayload(q));
      case "album":
        const albumResp = await Spotify.getAlbumTracks(parsed.id);

        const album = albumResp.body;
        const albumQueries = album.items.map(
          (item) =>
            item.name + " " + item.artists.map((a) => a.name).join(" ")
        );
        return albumQueries.map((q) => new UnsearchedYoutubePayload(q));
      default:
        throw new Error(
          "i don't support " + parsed.type + " links :("
        );
    }

  }

  if (!ytPayload) {
    if (!firstWord.startsWith("https://") && !firstWord.startsWith("http://")) {
      const result = await Search.searchVideos(fullArgs);
      if (!result || result.length === 0) {
        throw new Error("i couldn't find that on youtube :(");
      }
      return new YouTubeAudio(result[0].link, result[0].title);

    } else {
      const songInfo = await ytdl.getInfo(
        firstWord.replace("https://", "http://")
      );
      return new YouTubeAudio(
        songInfo.videoDetails.video_url,
        songInfo.videoDetails.title
      );
    }
  }

}

function parseSpotifyUri(uri) {
  try {
    return parse(uri);
  } catch (e) {
    return null;
  }
}