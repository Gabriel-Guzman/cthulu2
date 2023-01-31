import { Search, UnsearchedYoutubePayload, YouTubeAudio } from "@/audio";
import { Album, parse, ParsedSpotifyUri, Playlist, Track } from "spotify-uri";
import { IAudioPayload } from "@/audio/core/aqm";
import ytdl from "ytdl-core";
import Spotify, { confirmCredentials } from "@/discord/spotify";

function parseSpotifyUri(uri): ParsedSpotifyUri | null {
    try {
        return parse(uri);
    } catch (e) {
        return null;
    }
}

export async function buildPayload(query): Promise<IAudioPayload> {
    const firstWord = query.trim().split(" ")[0];
    const fullArgs = query;

    const parsed = parseSpotifyUri(firstWord);

    let ytPayload;

    const spotify = Spotify();

    if (parsed) {
        await confirmCredentials(spotify);

        switch (parsed.type) {
            case "track":
                const castedTrack = parsed as Track;
                const resp = await spotify.getTrack(castedTrack.id);

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
                const castedPlaylist = parsed as Playlist;
                const playlistResp = await spotify.getPlaylist(
                    castedPlaylist.id
                );

                const playlist = playlistResp.body;
                const queries = playlist.tracks.items.map(
                    (item) =>
                        item.track.name +
                        " " +
                        item.track.artists.map((a) => a.name).join(" ")
                );
                return queries.map((q) => new UnsearchedYoutubePayload(q));
            case "album":
                const castedAlbum = parsed as Album;
                const albumResp = await spotify.getAlbumTracks(castedAlbum.id);

                const album = albumResp.body;
                const albumQueries = album.items.map(
                    (item) =>
                        item.name +
                        " " +
                        item.artists.map((a) => a.name).join(" ")
                );
                return albumQueries.map((q) => new UnsearchedYoutubePayload(q));
            default:
                throw new Error("i don't support " + parsed.type + " links :(");
        }
    }

    if (!ytPayload) {
        if (
            !firstWord.startsWith("https://") &&
            !firstWord.startsWith("http://")
        ) {
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
