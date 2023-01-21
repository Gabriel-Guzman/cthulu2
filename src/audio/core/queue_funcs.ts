import { Readable } from "stream";
import { CommandInteraction, TextChannel, VoiceChannel } from "discord.js";

type Queue<T> = {
  payloads: Array<T>;
  current: void | T;
};

function createQueue<T>(): Queue<T> {
  return {
    payloads: [],
    current: undefined,
  };
}

type MusicPayload = {
  title: string;
  requestedBy: string;
  getStream: () => Readable;
};

type GuildQueue = {
  channel: VoiceChannel;
  textChannel: TextChannel;
  payloads: Array<MusicPayload>;
};

function createGuildQueue(
  voiceChannel: VoiceChannel,
  textChannel: TextChannel
): GuildQueue {
  return {
    channel: voiceChannel,
    payloads: [],
    textChannel: textChannel,
  };
}

type GuildQueueMap = {
  map: Map<string, GuildQueue>;
};

function addToQueue(queue: GuildQueue, payload: MusicPayload): void {
  queue.payloads.push(payload);
}

function initVoiceConnection(voiceChannel: VoiceChannel) {
  // create audio player
  // joinAndSubscribe
}

class GuildQueueManager {
  map: Map<string, GuildQueue> = new Map();
  queue(
    id: string,
    payload: MusicPayload,
    voiceChannel: VoiceChannel,
    textChannel: TextChannel
  ): void {
    const gq = this.map.get(id);
    if (gq) {
      gq.payloads.push(payload);
    } else {
      const newGq = createGuildQueue(voiceChannel, textChannel);
      this.map.set(id, newGq);

      // start the music
    }
  }

  queueFromCommandInteraction(
    interaction: CommandInteraction,
    payload: MusicPayload
  ) {}
}

const GQM = new GuildQueueManager();
export default GQM;
