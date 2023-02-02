import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    CreateAudioPlayerOptions,
    NoSubscriberBehavior,
    PlayerSubscription,
} from '@discordjs/voice';
import { TextBasedChannel, VoiceChannel } from 'discord.js';

class AudioPayload {
    public readonly requestedBy: string;
    constructor(requestedBy: string) {
        this.requestedBy = requestedBy;
    }
}

export interface IAudioPayload extends AudioPayload {}

export class YoutubePayload extends AudioPayload {
    link: string;
    title: string;
    constructor(link, title, requestedBy: string) {
        super(requestedBy);
        this.link = link;
        this.title = title;
    }
}

export class FilePayload extends AudioPayload {
    path: string;
    volume: number;
    constructor(path, volume, requestedBy) {
        super(requestedBy);
        this.path = path;
        this.volume = volume;
    }
}

export class UnsearchedYoutubePayload extends AudioPayload {
    query: string;
    constructor(query, requestedBy) {
        super(requestedBy);
        this.query = query;
    }
}

class GuildQueue {
    payloads: Array<AudioPayload>;
    player: AudioPlayer;
    textChannel: TextBasedChannel;
    subscription: PlayerSubscription;

    constructor(player, payload, textChannel, subscription) {
        this.player = player;
        if (Array.isArray(payload)) {
            this.payloads = payload;
        } else {
            this.payloads = [payload];
        }
        this.textChannel = textChannel;
        this.subscription = subscription;
    }

    shiftQueue(): AudioPayload | undefined {
        return this.payloads.shift();
    }

    addToQueue(payload) {
        this.payloads.push(payload);
    }

    playNext;
}

type IdleHandler = () => any;

type WrappedAudioPlayer = {
    (opts: CreateAudioPlayerOptions): WrappedAudioPlayer;
    setOnIdle: (IdleHandler) => any | Promise<any>;
    player: () => AudioPlayer;
};

function newAudioPlayer(opts: CreateAudioPlayerOptions): WrappedAudioPlayer {
    const player = createAudioPlayer(opts);

    player.on('error', (error) => {
        console.error(error);
    });
    player.on(AudioPlayerStatus.AutoPaused, () => {
        // player has no connection
        // TODO do something about it
    });

    let onIdle = (): void => {};
    player.on(AudioPlayerStatus.Idle, () => {
        onIdle();
    });

    this.setOnIdle = function (fn: () => void) {
        onIdle = fn;
        return this;
    };

    this.player = () => player;
    return this;
}

function consumeQueue(gq: GuildQueue): void {
    const next = gq.shiftQueue();
}

type QueueOpts = {
    guildId: string;
    voiceChannel: VoiceChannel;
    textChannel: TextBasedChannel;
    payload: AudioPayload;
};
class AudioQueueManager {
    queues = new Map<string, GuildQueue | undefined>();

    async queue(
        opts: QueueOpts,
        // if the payload should only be queued given that the queue is empty,
        // then this is true
        attemptImmediate = false
    ): Promise<void> {
        const gq = this.queues.get(opts.guildId);
        if (gq) {
            if (attemptImmediate) return;
            return gq.addToQueue(opts.payload);
        }

        // create audio player
        const player = newAudioPlayer({}).setOnIdle(() => {
            const gq = this.queues.get(opts.guildId);
            if (gq) return consumeQueue(gq);
        });

        // if we have a voice connection, just subscribe the player

        // else establish a connection
    }
}

export const AQM = new AudioQueueManager();
