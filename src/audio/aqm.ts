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

    getThumbnail(): string | Promise<string>;
}

export type IAudioPayload = AudioPayload;

export class YoutubePayload implements AudioPayload {
    readonly link: string;
    readonly title: string;
    readonly thumbnail: string;
    requestedBy: string;

    constructor(
        link: string,
        title: string,
        requestedBy: string,
        thumbnail: string,
    ) {
        this.link = link;
        this.title = title;
        this.requestedBy = requestedBy;
        this.thumbnail = thumbnail;
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

    getThumbnail(): string {
        return this.thumbnail;
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

    async getThumbnail(): Promise<string> {
        await this.load();
        return this._payload.getThumbnail();
    }

    async toYoutubePayload(): Promise<YoutubePayload> {
        await this.load();
        return this._payload;
    }

    async load(): Promise<void> {
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
            item.thumbnails.default,
        );
    }
}

enum QueueState {
    NOT_READY,
    PLAYING,
}

export type Payload = UnsoughtYoutubePayload | YoutubePayload;

class GuildQueue {
    payloads: Array<Payload> = [];
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

    async add(payload: Payload): Promise<void> {
        this.payloads.push(payload);
        await this.setState(QueueState.PLAYING);
    }

    public queue(
        payload: Payload,
        textChannel: TextChannel | null,
    ): Promise<void> {
        if (!this.textChannel) this.textChannel = textChannel;
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

    list(): Payload[] {
        return this.payloads;
    }

    nowPlaying(): AudioPayload {
        return this.current;
    }

    private async next(): Promise<void> {
        const nextPayload = this.shiftQueue();
        if (nextPayload) {
            this.current = nextPayload;
            this.player.play(await this.current.toResource());

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
                    await this.next();
                }
                break;
            case QueueState.PLAYING:
                if (newState === QueueState.NOT_READY) {
                    this.player.off(
                        AudioPlayerStatus.AutoPaused,
                        this.autoPausedListener,
                    );
                    this.player.off(AudioPlayerStatus.Idle, this.idleListener);
                    this.payloads = [];
                    this.player.stop();
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
            // this is bad... i guess we'll just set not ready state to get our
            // player in order
            this.setState(QueueState.NOT_READY);
        });

        return player;
    }
}

class AudioQueueManager {
    queues = new Map<string, GuildQueue>();

    stop(guildId: string): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.stop();
        }
    }

    pause(guildId: string): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.pause();
        }
    }

    resume(guildId: string): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.resume();
        }
    }

    skip(guildId: string): void {
        const gq = this.queues.get(guildId);
        if (gq) {
            gq.skip();
        }
    }

    list(guildId: string): Payload[] {
        const gq = this.queues.get(guildId);
        if (gq) {
            return gq.list();
        }
        return [];
    }

    async queue(
        channel: VoiceChannel,
        textChannel: TextChannel | null,
        payload: Payload,
    ): Promise<void> {
        let gq = this.queues.get(channel.guild.id);
        if (gq) {
            await gq.add(payload);
            return;
        }

        gq = await this.newGuildQueue(channel, textChannel);
        await gq.add(payload);
    }

    getChannelId(guildId: string): string {
        const gq = this.queues.get(guildId);
        if (gq) {
            return gq.connection.joinConfig.channelId;
        }
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

        if (!channel.joinable) throw new Error('channel is not joinable');

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

        return connection;
    }

    private async newGuildQueue(
        channel: VoiceChannel,
        textChannel: TextChannel,
    ): Promise<GuildQueue> {
        const connection = await this.connectToVoice(channel, channel.guild.id);

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(
                        connection,
                        VoiceConnectionStatus.Signalling,
                        600,
                    ),
                    entersState(
                        connection,
                        VoiceConnectionStatus.Connecting,
                        600,
                    ),
                ]);
                // Seems to be reconnecting to a new channel - ignore disconnect
            } catch (error) {
                // Seems to be a real disconnect which SHOULDN'T be recovered from
                connection.destroy();
                const queue = this.queues.get(channel.guild.id);
                await queue.stop();
                this.queues.delete(channel.guild.id);
            }
        });

        const gq = new GuildQueue(textChannel, connection);
        this.queues.set(channel.guild.id, gq);
        return gq;
    }
}

export const AQM = new AudioQueueManager();
