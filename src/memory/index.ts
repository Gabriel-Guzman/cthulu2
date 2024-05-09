import { IMemory } from '@/memory/types';

// type Lock = {
//     res: () => void;
//     lock: Promise<void>;
// };
//
// async function wait(ms: number): Promise<void> {
//     return new Promise<void>((resolve) => {
//         setTimeout(resolve, ms);
//     });
// }
//
// async function waitFor(
//     fn: () => boolean | Promise<boolean>,
//     count: number,
//     // ms between checks
//     interval: number,
// ): Promise<void> {
//     for (let i = 0; i < count; i++) {
//         if (await fn()) return;
//         await wait(interval);
//     }
// }

class IPM<K, AllowedTypes> implements IMemory<K, AllowedTypes> {
    storage = new Map<K, AllowedTypes>();
    ttlTimeouts = new Map();

    flush(): void {
        this.storage.clear();
        this.ttlTimeouts.clear();
    }

    async write(key, value) {
        this.storage.set(key, value);
    }

    async writeWithTTL(key, value, age = 1000 * 60 * 60) {
        const existingTimeout = this.ttlTimeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        const timeout = setTimeout(() => {
            this.delete(key);
        }, age);

        this.ttlTimeouts.set(key, timeout);

        await this.write(key, value);
    }

    delete(key) {
        this.storage.delete(key);
        const existingTimeout = this.ttlTimeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
    }

    get(key: K): AllowedTypes {
        const data = this.storage.get(key);
        console.log('GET', key);
        return data;
    }
}

export default IPM;
