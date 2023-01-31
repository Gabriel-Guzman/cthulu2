import ytdl from "ytdl-core";
import fs from "fs";

import {
    joinVoiceChannel,
    getVoiceConnection,
    createAudioResource,
    createAudioPlayer,
    VoiceConnectionStatus,
    entersState,
    AudioPlayerStatus,
    AudioPlayer,
    PlayerSubscription,
    VoiceConnection,
} from "@discordjs/voice";

import Search from "./Search.js";
import { TextBasedChannel } from "discord.js";

class AudioPayload {}

export interface IAudioPayload extends AudioPayload {}

export class YoutubePayload extends AudioPayload {
    link: string;
    title: string;
    constructor(link, title) {
        super();
        this.link = link;
        this.title = title;
    }
}

export class FilePayload extends AudioPayload {
    path: string;
    volume: number;
    constructor(path, volume) {
        super();
        this.path = path;
        this.volume = volume;
    }
}

export class UnsearchedYoutubePayload extends AudioPayload {
    query: string;
    constructor(query) {
        super();
        this.query = query;
    }
}

class GuildQueue {
    payloads: Array<AudioPayload>;
    player: AudioPlayer;
    textChannel: TextBasedChannel;
    subscription: PlayerSubscription;
    locked: boolean;

    constructor(player, payload, textChannel, subscription, locked = false) {
        this.player = player;
        if (Array.isArray(payload)) {
            this.payloads = payload;
        } else {
            this.payloads = [payload];
        }
        this.textChannel = textChannel;
        this.subscription = subscription;
        this.locked = locked;
    }

    shiftQueue(): AudioPayload | undefined {
        return this.payloads.shift();
    }

    addToQueue(payload) {
        this.payloads.push(payload);
    }
}

class AudioQueueManager {
    queues = new Map<string, GuildQueue>();

    async joinAndSubscribe(channel, player): Promise<PlayerSubscription> {
        let connection: VoiceConnection | undefined;
        connection = getVoiceConnection(channel.guild.id);
        if (connection === undefined) {
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            const winner = await Promise.race([
                new Promise<PlayerSubscription>((res) => {
                    connection.on(VoiceConnectionStatus.Ready, () => {
                        res(connection.subscribe(player));
                    });
                }),
                new Promise<boolean>((res) =>
                    setTimeout(() => res(false), 5000)
                ),
            ]);

            const subscription = winner;
            if (!winner) {
                throw new Error("timed out waiting for voice connection");
            }

            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(
                            connection,
                            VoiceConnectionStatus.Signalling,
                            5_000
                        ),
                        entersState(
                            connection,
                            VoiceConnectionStatus.Connecting,
                            5_000
                        ),
                    ]);
                    // Seems to be reconnecting to a new channel - ignore disconnect
                } catch (error) {
                    // Seems to be a real disconnect which SHOULDN'T be recovered from
                    this.end(channel.guild.id);
                }
            });

            return subscription as PlayerSubscription;
        }
        return connection.subscribe(player);
    }

    _delete(guildId) {
        const gq = this.queues.get(guildId);
        if (gq) {
            if (gq.subscription) gq.subscription.unsubscribe();
            this.queues.delete(guildId);
        }
    }

    async next(guildId): Promise<void> {
        const gq = this.queues.get(guildId);

        if (!gq) {
            return null;
        }
        const resolvedGuild = gq;

        const nextPayload = resolvedGuild.shiftQueue();
        if (nextPayload) {
            await this.play(resolvedGuild, nextPayload);
        } else {
            this._delete(guildId);
        }
    }

    end(guildId): void {
        const connection = getVoiceConnection(guildId);
        if (connection) connection.destroy();
        this._delete(guildId);
    }

    stop(guildId): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.payloads = [];
            gq.player.stop();
        }
    }

    pause(guildId): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.player.pause();
        }
    }

    resume(guildId): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.player.unpause();
        }
    }

    getQueue(guildId) {
        const gq = this.queues.get(guildId);
        if (gq) {
            const payloads = gq.payloads;
            return payloads.map((payload) => {
                if (payload instanceof YoutubePayload) {
                    return payload.title;
                } else if (payload instanceof UnsearchedYoutubePayload) {
                    return payload.query;
                } else if (payload instanceof FilePayload) {
                    return payload.path.split("/").reverse().pop();
                }
            });
        }

        return [];
    }

    skip(guildId) {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.player.stop();
        }
    }

    async play(gq: GuildQueue, payload) {
        let resource;
        if (payload instanceof FilePayload) {
            const file = createAudioResource(
                fs.createReadStream(payload.path),
                {
                    inlineVolume: true,
                }
            );
            file.volume.setVolume(payload.volume);
            resource = file;
        } else if (payload instanceof YoutubePayload) {
            const stream = await ytdl(payload.link, {
                filter: "audioonly",
                quality: "highest",
                highWaterMark: 3.2e7,
            });

            resource = createAudioResource(stream);
            if (gq.textChannel)
                gq.textChannel.send(`Now playing ${payload.title}`);
        } else if (payload instanceof UnsearchedYoutubePayload) {
            const result = await Search.searchVideos(payload.query);
            if (!result || result.length === 0) {
                if (gq.textChannel)
                    gq.textChannel.send(
                        `i couldn't find "${payload.query}" on youtube :(`
                    );
                return true;
            }
            const stream = await ytdl(result[0].link, {
                filter: "audioonly",
                quality: "highest",
                highWaterMark: 3.2e7,
            });
            resource = createAudioResource(stream);
            if (gq.textChannel)
                gq.textChannel.send(`Now playing ${result[0].title}`);
        }

        gq.player.play(resource);
    }

    async queue(channel, textChannel, payload, locked = false) {
        const gq = this.queues.get(channel.guild.id);
        if (!gq) {
            const player = createAudioPlayer({});
            player.on("error", (error) => {
                console.error(error);
            });
            player.on(AudioPlayerStatus.AutoPaused, () => {
                // player has no connection
                // TODO do something about it
            });
            player.on(AudioPlayerStatus.Idle, () => {
                this.next(channel.guild.id);
            });
            const subscription = await this.joinAndSubscribe(channel, player);
            const newGQ = new GuildQueue(
                player,
                payload,
                textChannel,
                subscription
            );
            this.queues.set(channel.guild.id, newGQ);

            await this.next(channel.guild.id);
        } else {
            if (locked) {
                return false;
            }
            gq.addToQueue(payload);
        }
        return true;
    }

    async playImmediately(channel, textChannel, payload) {
        const gq = this.queues.get(channel.guild.id);
        if (gq) {
            return false;
        }

        await this.queue(channel, textChannel, payload);
        return true;
    }

    async playImmediatelySilent(channel, payload) {
        const gq = this.queues.get(channel.guild.id);
        if (gq) {
            return false;
        }

        await this.queue(channel, false, payload, true);
        return true;
    }
}

export const AQM = new AudioQueueManager();
