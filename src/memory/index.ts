import { IMemory } from '@/memory/types';

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

    async writeWithTTL(key, value, ageInSeconds = 60 * 60) {
        const existingTimeout = this.ttlTimeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        const timeout = setTimeout(() => {
            this.delete(key);
        }, ageInSeconds * 1000);

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
        return this.storage.get(key);
    }
}

export default IPM;
