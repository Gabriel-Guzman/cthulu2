import memory from '@/memory';

const Memory = new memory();

beforeEach(() => {
    Memory.flush();
});

describe('cache expiry works', () => {
    it('expires the write', async () => {
        const mem = Memory;
        await mem.writeWithTTL('key', 1, 0.1);
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 150);
        });
        expect(mem.get('key')).toEqual(undefined);
    });
});
