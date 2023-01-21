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
} from "@discordjs/voice";

import Search from "./Search.js";

class AudioPayload {}

export class YoutubePayload extends AudioPayload {
  constructor(link, title) {
    super();
    this.link = link;
    this.title = title;
  }
}

export class FilePayload extends AudioPayload {
  constructor(path, volume) {
    super();
    this.path = path;
    this.volume = volume;
  }
}

export class UnsearchedYoutubePayload extends AudioPayload {
  constructor(query) {
    super();
    this.query = query;
  }
}

class GuildQueue {
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

  shiftQueue() {
    return this.payloads.shift();
  }

  addToQueue(payload) {
    this.payloads.push(payload);
  }
}

class AudioQueueManager {
  queues = new Map();

  async joinAndSubscribe(channel, player) {
    let connection;
    connection = getVoiceConnection(channel.guild.id);

    // connection.joinConfig.channelId
    // fetch channel using id
    // determine how many member are in the channel
    // if its different and there are no members, switch over

    if (connection === undefined) {
      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      const winner = await Promise.race([
        new Promise((res, rej) => {
          connection.on(VoiceConnectionStatus.Ready, () => {
            res(connection.subscribe(player));
          });
        }),
        new Promise((res, rej) => setTimeout(() => res(false), 5000)),
      ]);

      const subscription = winner;
      if (!winner) {
        throw new Error("timed out waiting for voice connection");
      }

      connection.on(
        VoiceConnectionStatus.Disconnected,
        async (oldState, newState) => {
          try {
            await Promise.race([
              entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
              entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
            // Seems to be reconnecting to a new channel - ignore disconnect
          } catch (error) {
            // Seems to be a real disconnect which SHOULDN'T be recovered from
            this.end(channel.guild.id);
          }
        }
      );

      return subscription;
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

  async next(guildId) {
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

  end(guildId) {
    const connection = getVoiceConnection(guildId);
    if (connection) connection.destroy();
    this._delete(guildId);
  }

  stop(guildId) {
    const gq = this.queues.get(guildId);
    if (gq) {
      gq.payloads = [];
      gq.player.stop();
    }
  }

  pause(guildId) {
    const gq = this.queues.get(guildId);
    if (gq) {
      gq.player.pause();
    }
  }

  resume(guildId) {
    const gq = this.queues.get(guildId);
    if (gq) {
      gq.player.unpause();
    }
  }

  getQueue(guildId) {
    const gq = this.queues.get(guildId);
    if (gq) {
      const payloads = gq.payloads;
      const ret = payloads.map((payload) => {
        if (payload instanceof YoutubePayload) {
          return payload.title;
        } else if (payload instanceof UnsearchedYoutubePayload) {
          return payload.query;
        } else if (payload instanceof FilePayload) {
          return payload.path.split("/").reverse().pop();
        }
      });

      return ret;
    }

    return [];
  }

  skip(guildId) {
    const gq = this.queues.get(guildId);
    if (gq) {
      gq.player.stop();
    }
  }

  async play(gq, payload) {
    let resource;
    if (payload instanceof FilePayload) {
      const file = createAudioResource(fs.createReadStream(payload.path), {
        inlineVolume: true,
      });
      file.volume.setVolume(payload.volume);
      resource = file;
    } else if (payload instanceof YoutubePayload) {
      const stream = await ytdl(payload.link, {
        filter: "audioonly",
        quality: "highest",
        highWaterMark: 3.2e7,
      });

      resource = createAudioResource(stream);
      if (gq.textChannel) gq.textChannel.send(`Now playing ${payload.title}`);
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
      if (gq.textChannel) gq.textChannel.send(`Now playing ${result[0].title}`);
    }

    gq.player.play(resource);
  }

  async queue(channel, textChannel, payload, locked = false) {
    const gq = this.queues.get(channel.guild.id);
    console.log(gq, payload);
    if (!gq) {
      const player = createAudioPlayer({});
      player.on("error", (error) => {
        console.error(error);
      });
      player.on(AudioPlayerStatus.Idle, () => {
        this.next(channel.guild.id);
      });
      const subscription = await this.joinAndSubscribe(channel, player);
      const newGQ = new GuildQueue(player, payload, textChannel, subscription);
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
