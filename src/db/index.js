import mongoose from "mongoose";
import Memory from "../memory/index.js";

export default function() {
 return mongoose.connect(
    process.env.MONGODB_URI,
  ).then(() => { console.info("connected to MongoDB"); });
}

const youtubeStatsSchema = new mongoose.Schema(
  {
    guildId: String,
    action: String,
    executedBy: String,
  },
  { timestamps: true }
);

const profanitySchema = new mongoose.Schema(
  {
    guildId: String,
    phrase: String,
    saidBy: String,
  },
  { timestamps: true }
);

const acceptRulesSchema = new mongoose.Schema({
  rulesChannel: String,
  rulesMessage: String,
  beforeAcceptRole: String,
  afterAcceptRole: String,
});

const serverInfoSchema = new mongoose.Schema({
  guildId: String,
  botReservedTextChannels: [String],
  globallyAllowedBots: [String],
  intros: {
    type: Map,
    of: String,
  },
  logChannel: String,
  adminRoles: [String],
  acceptRules: acceptRulesSchema,
});

const guildUserInfoSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  xp: {
    type: Number,
    default: 83,
  },
  lastLevelCongratulated: {
    type: Number,
    default: 1,
  },
});

const jobSchema = new mongoose.Schema({
  userId: String,
  requestedJob: String,
  options: mongoose.Schema.Types.Mixed,
  frequency: Number,
  lastRun: {
    type: mongoose.Schema.Types.Date,
    default: new Date("1995-12-17T03:24:00"),
  },
});

const YoutubeStats = mongoose.model("YouTubeStats", youtubeStatsSchema);
const Profanity = mongoose.model("Profanity", profanitySchema);
const ServerInfo = mongoose.model("ServerInfo", serverInfoSchema);
const Job = mongoose.model("Job", jobSchema);
const GuildUserInfo = mongoose.model("GuildUserInfo", guildUserInfoSchema);

const keyGens = new Map();
keyGens.set(GuildUserInfo, ({userId, guildId}) => `guild_user_info_${userId}_${guildId}`)
keyGens.set(ServerInfo, ({guildId}) => `server_info_${guildId}`);

async function cachedFindOne(model, opts, upsert = false) {
  const gen = keyGens.get(model);
  if (!gen) {
    throw new Error("cachedFindOne called on model with no key generator");
  }
  const key = gen(opts);
  let res = Memory.get(key);
  if (res) return res;

  res = await model.findOne(opts);
  if (res) {
    await Memory.writeWithTTL(key, res);
    return res;
  }

  if (upsert) {
    res = await model.create(opts);
    await Memory.writeWithTTL(key, res);
    return res;
  }

  return undefined;
}

function removeFromCache(model, opts) {
  const gen = keyGens.get(model);
  if (!gen) {
    throw new Error("removeFromCache called on model with no key generator");
  }
  return Memory.delete(gen(model, opts));
}

export { YoutubeStats, Profanity, ServerInfo, Job, GuildUserInfo, cachedFindOne };
