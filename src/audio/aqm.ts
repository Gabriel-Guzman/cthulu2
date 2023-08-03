import ytdl from 'ytdl-core';

import {
    AudioPlayer,
    AudioPlayerError,
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    PlayerSubscription,
    VoiceConnection,
    VoiceConnectionStatus,
} from '@discordjs/voice';

import Search from '@/audio/search';
import { EmbedBuilder, TextChannel, VoiceChannel } from 'discord.js';

interface AudioPayload {
    readonly requestedBy: string;

    toResource(): AudioResource | Promise<AudioResource>;

    getTitle(): string | Promise<string>;

    getLink(): string | Promise<string>;
}

export type IAudioPayload = AudioPayload;

export class YoutubePayload implements AudioPayload {
    readonly link: string;
    readonly title: string;
    requestedBy: string;

    constructor(link: string, title: string, requestedBy: string) {
        this.link = link;
        this.title = title;
        this.requestedBy = requestedBy;
    }

    async toResource(): Promise<AudioResource> {
        const stream = await ytdl(this.link, {
            filter: 'audioonly',
            quality: 'highest',
            highWaterMark: 3.2e7,
        });
        return createAudioResource(stream);
    }

    getTitle(): string {
        return this.title;
    }

    getLink(): string {
        return this.link;
    }
}

export class UnsoughtYoutubePayload implements AudioPayload {
    query: string;
    requestedBy: string;

    private _payload?: YoutubePayload;

    constructor(query, requestedBy) {
        this.query = query;
        this.requestedBy = requestedBy;
    }

    async toResource(): Promise<AudioResource> {
        await this.load();
        return this._payload.toResource();
    }

    async getTitle(): Promise<string> {
        await this.load();
        return this._payload.getTitle();
    }

    async getLink(): Promise<string> {
        await this.load();
        return this._payload.getLink();
    }

    private async load(): Promise<void> {
        if (this._payload) return;
        const result = await Search.searchVideos(this.query);
        if (!result || result.length === 0) {
            throw new Error('song not found from search');
        }

        const item = result[0];

        this._payload = new YoutubePayload(
            item.link,
            item.title,
            this.requestedBy,
        );
    }
}

enum QueueState {
    NOT_READY,
    PLAYING,
}

class GuildQueue {
    payloads: Array<AudioPayload> = [];
    subscription?: PlayerSubscription;
    textChannel: TextChannel;
    connection: VoiceConnection;
    private player?: AudioPlayer;
    private state: QueueState = QueueState.NOT_READY;
    private current: AudioPayload;

    constructor(textChannel: TextChannel, connection: VoiceConnection) {
        this.textChannel = textChannel;
        this.connection = connection;
    }

    public getState(): QueueState {
        return this.state;
    }

    add(payload: AudioPayload): Promise<void> {
        this.payloads.push(payload);
        return this.next();
    }

    public queue(
        payload: AudioPayload,
        textChannel: TextChannel | null,
    ): Promise<void> {
        this.textChannel = textChannel;
        return this.add(payload);
    }

    skip(): void {
        this.player.stop();
    }

    stop(): Promise<void> {
        return this.setState(QueueState.NOT_READY);
    }

    pause(): void {
        this.player.pause();
    }

    resume(): void {
        this.player.unpause();
    }

    list(): AudioPayload[] {
        return this.payloads;
    }

    nowPlaying(): AudioPayload {
        return this.current;
    }

    private async next(silent = false): Promise<void> {
        const nextPayload = this.shiftQueue();
        if (nextPayload) {
            this.current = nextPayload;
            await this.setState(QueueState.PLAYING);

            if (silent) return;

            const embed = new EmbedBuilder()
                .setAuthor({ name: 'now playing' })
                .setDescription(
                    `[${await nextPayload.getTitle()}](${await nextPayload.getLink()})`,
                );

            await this.textChannel?.send({ embeds: [embed] });
            return;
        }

        // no songs left, kill the player
        return this.setState(QueueState.NOT_READY);
    }

    private async setState(newState: QueueState): Promise<void> {
        switch (this.state /* old state */) {
            case QueueState.NOT_READY:
                if (newState === QueueState.PLAYING) {
                    this.player = this.buildAudioPlayer();
                    this.subscription = this.connection.subscribe(this.player);
                    this.player.play(await this.current.toResource());
                }
                break;
            case QueueState.PLAYING:
                if (newState === QueueState.NOT_READY) {
                    this.player.off(
                        AudioPlayerStatus.AutoPaused,
                        this.autoPausedListener,
                    );
                    this.player.off(AudioPlayerStatus.Idle, this.idleListener);
                    this.player.stop();
                    this.payloads = [];
                    this.subscription.unsubscribe();
                    delete this.player;
                }
                break;
        }

        this.state = newState;
    }

    private shiftQueue(): AudioPayload | undefined {
        return this.payloads.shift();
    }

    private autoPausedListener() {
        this.textChannel
            ?.send('i have been autopaused...')
            .catch(console.error);
    }

    private async idleListener() {
        try {
            await this.next();
        } catch (err) {
            console.error(err);
            await this.textChannel?.send(
                'i have encountered an error while progressing the queue. this is all i know.\n' +
                    '```' +
                    err +
                    '```',
            );
        }
    }

    private buildAudioPlayer(): AudioPlayer {
        const player = createAudioPlayer({});
        const detailed = (error: AudioPlayerError) =>
            '```' +
            error.name +
            ': ' +
            error.message +
            '\n' +
            error.resource.metadata +
            '```';

        player.on('error', (error) => {
            this.textChannel?.send(
                `error playing ${this.current} >:(\n${detailed(error)}`,
            );
            console.error(error);
        });

        player.on(
            AudioPlayerStatus.AutoPaused,
            this.autoPausedListener.bind(this),
        );

        player.on(AudioPlayerStatus.Idle, this.idleListener.bind(this));

        player.on('unsubscribe', (subscription) => {
            console.log('GuildQueue: unsubscribe event from ', subscription);
        });

        return player;
    }
}

class AudioQueueManager {
    queues = new Map<string, GuildQueue>();

    stop(guildId): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.stop();
        }
    }

    pause(guildId): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.pause();
        }
    }

    resume(guildId): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.resume();
        }
    }

    skip(guildId): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.stop();
        }
    }

    async queue(
        channel: VoiceChannel,
        textChannel: TextChannel | null,
        payload: AudioPayload,
    ): Promise<void> {
        let gq = this.queues.get(channel.guild.id);
        if (gq) {
            await gq.add(payload);
            return;
        }

        gq = await this.newGuildQueue(channel, textChannel);
        await gq.add(payload);
    }

    async playImmediatelySilent(channel, payload) {
        let gq = this.queues.get(channel.guild.id);
        if (gq && gq.getState() === QueueState.PLAYING) {
            return false;
        }

        if (!gq) gq = await this.newGuildQueue(channel, null);

        await gq.queue(payload, null);
        this.queues.set(channel.guild.id, gq);
        return true;
    }

    async connectToVoice(
        channel: VoiceChannel,
        guildId: string,
    ): Promise<VoiceConnection> {
        let connection = getVoiceConnection(guildId);
        if (connection) return connection;

        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        const winner = await Promise.race([
            new Promise<boolean>((res) => {
                connection.on(VoiceConnectionStatus.Ready, () => {
                    res(true);
                });
            }),
            new Promise<boolean>((res) => setTimeout(() => res(false), 5000)),
        ]);

        if (!winner) {
            connection.disconnect();
            connection.destroy();
            throw new Error('timed out waiting for voice connection');
        }

        connection.on('debug', (m) => console.debug('vc debug: ' + m));
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(
                        connection,
                        VoiceConnectionStatus.Signalling,
                        5_000,
                    ),
                    entersState(
                        connection,
                        VoiceConnectionStatus.Connecting,
                        5_000,
                    ),
                ]);
                // Seems to be reconnecting to a new channel - ignore disconnect
            } catch (error) {
                connection.disconnect();
                connection.destroy();
                // Seems to be a real disconnect which SHOULDN'T be recovered from
                console.error('general voice connection error: ' + error);
                throw error;
            }
        });

        return connection;
    }

    private async newGuildQueue(
        channel: VoiceChannel,
        textChannel: TextChannel,
    ): Promise<GuildQueue> {
        const connection = await this.connectToVoice(channel, channel.guild.id);
        console.log(connection);
        const gq = new GuildQueue(textChannel, connection);
        this.queues.set(channel.guild.id, gq);
        return gq;
    }
}

export const AQM = new AudioQueueManager();
