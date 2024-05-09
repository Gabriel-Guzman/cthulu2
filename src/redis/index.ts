import { createClient } from 'redis';
import { IMemory } from '@/memory/types';

async function buildRedisClient(uri: string) {
    const client = await createClient({
        url: uri,
    }).connect();
    return client;
}

type DePromise<T> = T extends Promise<infer D> ? D : never;
type TRedisClient = DePromise<ReturnType<typeof buildRedisClient>>;

export class ScoRedis implements IMemory<string, object> {
    private _client: TRedisClient;

    async init() {
        this._client = await buildRedisClient(process.env.REDIS_URI);
    }

    async delete(key): Promise<void> {
        await this._client.del(key);
    }

    async write(key, value): Promise<void> {
        await this._client.set(key, value);
    }

    async writeWithTTL(key, value, age): Promise<void> {
        await this._client.setEx(key, age, value);
    }

    async get<R>(key: string): Promise<R> {
        const res = await this._client.get(key);
        return JSON.parse(res) as R;
    }
}

export default async function BuildRedis(): Promise<ScoRedis> {
    const r = new ScoRedis();
    await r.init();
    return r;
}
