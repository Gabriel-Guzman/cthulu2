import mongoose, { HydratedDocument, Model } from 'mongoose';
import { builtClient } from '@/redis';

export default function () {
    return mongoose.connect(process.env.MONGODB_URI).then(() => {
        console.info('connected to MongoDB');
    });
}

const youtubeStatsSchema = new mongoose.Schema(
    {
        guildId: String,
        action: String,
        executedBy: String,
    },
    { timestamps: true },
);

const profanitySchema = new mongoose.Schema(
    {
        guildId: String,
        phrase: String,
        saidBy: String,
    },
    { timestamps: true },
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

serverInfoSchema.pre('save', async function () {
    try {
        await removeFromCache(ServerInfo, this);
    } catch (e) {
        console.error(e);
    }
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

guildUserInfoSchema.pre('save', async function () {
    try {
        await removeFromCache(GuildUserInfo, this);
    } catch (e) {
        console.error(e);
    }
});

const YoutubeStats = mongoose.model('YouTubeStats', youtubeStatsSchema);
const Profanity = mongoose.model('Profanity', profanitySchema);
const ServerInfo = mongoose.model<IServerInfo>('ServerInfo', serverInfoSchema);
const GuildUserInfo = mongoose.model<IGuildUserInfo>(
    'GuildUserInfo',
    guildUserInfoSchema,
);

export type IModels = IServerInfo | IGuildUserInfo;

type CacheKeyCreator = (document: Partial<IModels>) => string;

const keyGens = new Map<Model<any>, CacheKeyCreator>();

keyGens.set(
    GuildUserInfo,
    ({ userId, guildId }: IGuildUserInfo) =>
        `guild_user_info_${userId}_${guildId}`,
);
keyGens.set(ServerInfo, ({ guildId }: IServerInfo) => `server_info_${guildId}`);
function replacer(key, value) {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
}
function reviver(key, value) {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}
export async function findOrCreate<TQuery extends IModels>(
    model: Model<TQuery>,
    opts: Partial<TQuery>,
): Promise<HydratedDocument<TQuery>> {
    const Memory = builtClient.client;
    const gen = keyGens.get(model);
    if (!gen) {
        throw new Error(
            'cachedFindOneOrUpsert called on model with no key generator',
        );
    }
    const key = gen(opts);
    const timerLabel = 'findOrCreate ' + key;
    console.time(timerLabel);
    let res = await cachedFindOne(model, opts);
    if (res) {
        console.timeEnd(timerLabel);
        return res;
    }

    // doesn't exist yet. create it and add to cache
    res = await model.create(opts);

    await Memory.writeWithTTL(
        key,
        JSON.stringify(res.toObject(), replacer),
        60 * 60,
    );

    console.timeEnd(timerLabel);
    return res;
}

export async function cachedFindOne<T extends IModels>(
    model: Model<T>,
    opts: Partial<T>,
): Promise<HydratedDocument<T> | void> {
    const gen = keyGens.get(model);
    if (!gen) {
        throw new Error('cachedFindOne called on model with no key generator');
    }
    const key = gen(opts);
    return _cachedFindOne(key, model, opts);
}

async function _cachedFindOne<T extends IModels>(
    key: string,
    model: Model<T>,
    opts: Partial<T>,
): Promise<HydratedDocument<T> | void> {
    const Memory = builtClient.client;
    const val = await Memory.get(key);
    if (val) {
        // found in cache
        console.debug('found in cache', key);
        const res: T = <T>JSON.parse(val, reviver);
        return model.hydrate(res);
    } else {
        // not in cache, find in db
        const dbRes = await model.findOne(opts);
        if (dbRes) {
            // found in db, add to cache
            await Memory.writeWithTTL(
                key,
                JSON.stringify(dbRes.toObject(), replacer),
                60 * 60,
            );
        }
        return dbRes;
    }
}

export async function removeFromCache<T extends IModels>(
    model: Model<T>,
    opts: T,
): Promise<void> {
    const Memory = builtClient.client;
    const gen = keyGens.get(model);
    if (!gen) {
        throw new Error(
            'removeFromCache called on model with no key generator',
        );
    }
    return Memory.delete(gen(opts));
}

export { YoutubeStats, Profanity, ServerInfo, GuildUserInfo };
