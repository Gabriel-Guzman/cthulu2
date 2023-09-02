// noinspection HttpUrlsUsage

import {
    AQM,
    Payload,
    UnsoughtYoutubePayload,
    YoutubePayload,
} from '@/audio/aqm';
import Search from '@/audio/search';
import { Album, parse, ParsedSpotifyUri, Playlist, Track } from 'spotify-uri';
import ytdl from 'ytdl-core';
import Spotify, { confirmCredentials } from '@/discord/spotify';

function parseSpotifyUri(uri): ParsedSpotifyUri | null {
    try {
        return parse(uri);
    } catch (e) {
        return null;
    }
}

export function voiceChannelRestriction(
    guildId: string,
    channelId: string,
): boolean {
    if (AQM.getChannelId(guildId) && AQM.getChannelId(guildId) !== channelId) {
        return false;
    } else if (!channelId) {
        return false;
    }

    return true;
}

export async function buildPayload(
    query: string,
    requestedBy: string,
): Promise<Payload> {
    const firstWord = query.trim().split(' ')[0];
    const fullArgs = query;

    const parsed = parseSpotifyUri(firstWord);

    let ytPayload;

    const spotify = Spotify();

    if (parsed) {
        await confirmCredentials(spotify);

        switch (parsed.type) {
            case 'track':
                const castedTrack = parsed as Track;
                const resp = await spotify.getTrack(castedTrack.id);

                const track = resp.body;
                const name = track.name;
                const artists = track.artists.map((a) => a.name);
                const result = await Search.searchVideos(
                    name + ' ' + artists.join(' '),
                );
                if (!result || result.length === 0) {
                    throw new Error("i couldn't find that on youtube :(");
                }
                return new YoutubePayload(
                    result[0].link,
                    result[0].title,
                    requestedBy,
                    result[0].thumbnails.default,
                );
            case 'playlist':
                const castedPlaylist = parsed as Playlist;
                const playlistResp = await spotify.getPlaylist(
                    castedPlaylist.id,
                );

                const playlist = playlistResp.body;
                const queries = playlist.tracks.items.map(
                    (item) =>
                        item.track.name +
                        ' ' +
                        item.track.artists.map((a) => a.name).join(' '),
                );
                return queries.map(
                    (q) => new UnsoughtYoutubePayload(q, requestedBy),
                );
            case 'album':
                const castedAlbum = parsed as Album;
                const albumResp = await spotify.getAlbumTracks(castedAlbum.id);

                const album = albumResp.body;
                const albumQueries = album.items.map(
                    (item) =>
                        item.name +
                        ' ' +
                        item.artists.map((a) => a.name).join(' '),
                );
                return albumQueries.map(
                    (q) => new UnsoughtYoutubePayload(q, requestedBy),
                );
            default:
                throw new Error("i don't support " + parsed.type + ' links :(');
        }
    }

    if (!ytPayload) {
        if (
            !firstWord.startsWith('https://') &&
            !firstWord.startsWith('http://')
        ) {
            const result = await Search.searchVideos(fullArgs);
            if (!result || result.length === 0) {
                throw new Error("i couldn't find that on youtube :(");
            }
            return new YoutubePayload(
                result[0].link,
                result[0].title,
                requestedBy,
                result[0].thumbnails.default,
            );
        } else {
            const songInfo = await ytdl.getInfo(
                firstWord.replace('https://', 'http://'),
            );
            return new YoutubePayload(
                songInfo.videoDetails.video_url,
                songInfo.videoDetails.title,
                requestedBy,
                songInfo.thumbnail_url,
            );
        }
    }
}

// export function ensureVoiceConnectionTo(
//     guildId: string,
//     channel: VoiceChannel
// ): VoiceConnection {
//     const connection = getVoiceConnection(guildId);
//     if (connection) return connection;
//
//     const newConnection = joinVoiceChannel({
//         guildId,
//         channelId: channel.id,
//         adapterCreator: channel.guild.voiceAdapterCreator,
//     });
//
//
// }
