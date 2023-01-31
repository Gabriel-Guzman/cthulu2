import mongoose, { HydratedDocument, Model } from "mongoose";
import Memory from "@/memory";

export default function () {
    return mongoose.connect(process.env.MONGODB_URI).then(() => {
        console.info("connected to MongoDB");
    });
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

interface IAcceptRules {
    rulesChannel: string;
    rulesMessage: string;
    beforeAcceptRole: string;
    afterAcceptRole: string;
}

const acceptRulesSchema = new mongoose.Schema({
    rulesChannel: {
        type: String,
        required: true,
    },
    rulesMessage: {
        type: String,
        required: true,
    },
    beforeAcceptRole: {
        type: String,
        required: true,
    },
    afterAcceptRole: {
        type: String,
        required: true,
    },
});

export interface IServerInfo {
    guildId: string;
    botReservedTextChannels?: Array<string>;
    globallyAllowedBots?: Array<string>;
    intros?: Map<string, string>;
    logChannel?: string;
    adminRoles?: Array<string>;
    acceptRules?: IAcceptRules;
}

const serverInfoSchema = new mongoose.Schema<IServerInfo>({
    guildId: {
        type: String,
        required: true,
    },
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

export interface IGuildUserInfo {
    userId: string;
    guildId: string;
    xp: number;
    lastLevelCongratulated: number;
}

const guildUserInfoSchema = new mongoose.Schema<IGuildUserInfo>({
    userId: {
        type: String,
        required: true,
    },
    guildId: {
        type: String,
        required: true,
    },
    xp: {
        type: Number,
        default: 83,
    },
    lastLevelCongratulated: {
        type: Number,
        default: 1,
    },
});

const YoutubeStats = mongoose.model("YouTubeStats", youtubeStatsSchema);
const Profanity = mongoose.model("Profanity", profanitySchema);
const ServerInfo = mongoose.model<IServerInfo>("ServerInfo", serverInfoSchema);
const GuildUserInfo = mongoose.model<IGuildUserInfo>(
    "GuildUserInfo",
    guildUserInfoSchema
);

type IModels = IServerInfo | IGuildUserInfo;

type CacheKeyCreator = (document: Partial<IModels>) => string;

const keyGens = new Map<Model<any>, CacheKeyCreator>();

keyGens.set(
    GuildUserInfo,
    ({ userId, guildId }: IGuildUserInfo) =>
        `guild_user_info_${userId}_${guildId}`
);
keyGens.set(ServerInfo, ({ guildId }: IServerInfo) => `server_info_${guildId}`);

export async function cachedFindOneOrUpsert<TQuery extends IModels>(
    model: Model<TQuery>,
    opts: Partial<TQuery>
): Promise<HydratedDocument<TQuery>> {
    const gen = keyGens.get(model);
    if (!gen) {
        throw new Error(
            "cachedFindOneOrUpsert called on model with no key generator"
        );
    }
    const key = gen(opts);
    let res = await _cachedFindOne(key, model, opts);
    if (res) return res;

    res = await model.create(opts);
    await Memory.writeWithTTL(key, res);
    return res;
}

export async function cachedFindOne<T extends IModels>(
    model: Model<T>,
    opts: Partial<T>
): Promise<HydratedDocument<T> | void> {
    const gen = keyGens.get(model);
    if (!gen) {
        throw new Error("cachedFindOne called on model with no key generator");
    }
    const key = gen(opts);
    return _cachedFindOne(key, model, opts);
}

async function _cachedFindOne<T extends IModels>(
    key: string,
    model: Model<T>,
    opts: Partial<T>
): Promise<HydratedDocument<T> | void> {
    let res = Memory.get(key);
    if (res) return res;

    res = await model.findOne(opts);
    if (res) {
        await Memory.writeWithTTL(key, res);
        return res;
    }
}

export function removeFromCache<T extends IModels>(
    model: Model<T>,
    opts: T
): void {
    const gen = keyGens.get(model);
    if (!gen) {
        throw new Error(
            "removeFromCache called on model with no key generator"
        );
    }
    return Memory.delete(gen(opts));
}

export { YoutubeStats, Profanity, ServerInfo, GuildUserInfo };
