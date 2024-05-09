import { IMemory } from '@/memory/types';

function mutexLockKey(key: string): string {
    return 'mutex_key_' + key;
}

type ReleaseFn = () => Promise<void> | void;

export async function lock(
    memory: IMemory<unknown, unknown>,
    resourceName: string,
): Promise<ReleaseFn> {
    const maxTries = 10;
    const pollingInterval = 100; // ms
    let tries = 0;
    const lockKey = mutexLockKey(resourceName);

    let timeout: NodeJS.Timeout;

    while (tries < maxTries) {
        const exists = await this.get(lockKey);
        if (exists) {
            await new Promise<void>(
                (res) => (timeout = setTimeout(() => res(), pollingInterval)),
            );
            tries++;
        } else {
            await memory.writeWithTTL(lockKey, '1', 10 * 1000);
            clearTimeout(timeout);
            return () => memory.delete(lockKey);
        }
    }

    throw new Error(
        `Failed to acquire lock for ${resourceName} after ${tries} tries and ${
            tries * pollingInterval
        }ms`,
    );
}
