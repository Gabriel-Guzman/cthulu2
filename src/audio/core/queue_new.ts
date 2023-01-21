import { Client, GuildTextBasedChannel, TextChannel } from "discord.js";
import { createAudioResource } from "@discordjs/voice";
import { Readable } from "stream";

interface QueueInterface<T> {
  getCurrent: () => T;
  push: ([T]) => void;
  shift: () => void | T;
}

class Queue<PayloadType> implements QueueInterface<PayloadType> {
  protected payloads: Array<PayloadType> = [];
  private current: PayloadType | undefined;

  public getCurrent(): PayloadType {
    return this.current;
  }

  public push(payloads: Array<PayloadType>): void {
    this.payloads.push(...payloads);
  }

  public shift(): PayloadType | void {
    const next = this.payloads.shift();
    this.current = next;
    return next;
  }
}

interface QueueConsumerInterface<T> extends QueueInterface<T> {
  consume: (T) => void;
  next: () => void | T;
}

class QueueConsumer<T> extends Queue<T> implements QueueConsumerInterface<T> {
  readonly consume: (T) => void;

  constructor(consume: (T) => void) {
    super();
    this.consume = consume;
  }

  public next() {
    const next = this.shift();
    // should we auto consume here?
    this.consume(next);
    return next;
  }

  public start(): void {}
}

type Consumer<T> = (payload: T) => void;

class QueueConsumerManager<T> {
  protected queueConsumers: Map<string, QueueConsumerInterface<T>> = new Map();

  public queue(id: string, payload: T) {
    const consumer = this.queueConsumers.get(id);
    if (consumer) {
      consumer.push([payload]);
    } else {
      const newConsumer = new QueueConsumer<T>(this.consumerBuilder(id));
      newConsumer.push([payload]);
      this.queueConsumers.set(id, newConsumer);
    }
  }
}

type DiscordAudioPayload = {
  getStream(): Readable;
  volume: number;
};

type ConsumeCallback = () => void;

class DiscordQCM extends QueueConsumerManager<GuildQueueConsumer> {
  constructor(client: Client) {
    super();
  }
  private player;
  private buildOnConsume: ConsumeCallback;

  queue(id: string, payload: DiscordAudioPayload) {
    const consumer = this.queueConsumers.get(id);
    if (consumer) {
      consumer.
    }
  }
}

class GuildQueueConsumer extends QueueConsumer<DiscordAudioPayload> {
  guildId: string;
  channel: GuildTextBasedChannel;
}

type UserRequestedAudioPayload = {
  requester: string;
  title: string;
} & DiscordAudioPayload;

const test = new DiscordQCM(new Client({ intents: [] }));

const p: UserRequestedAudioPayload = {
  requester: "me",
  title: "title",
  getStream() {
    return new Readable();
  },
  volume: 1,
};
test.queue("id", p);
