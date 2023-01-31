class Memory {
    constructor() {}

    storage = new Map();
    mutex = new Map();
    ttlTimeouts = new Map();

    flush() {
        this.storage.clear();
        this.mutex.clear();
        this.ttlTimeouts.clear();
    }

    async lock(key) {
        const entry = this.mutex.get(key);
        if (entry) {
            await entry.lock;
        }

        const self = this;
        let lockResolve;
        let lock;
        await new Promise<void>(async (outsideRes) => {
            lock = new Promise((res) => {
                lockResolve = res;
                outsideRes();
            });

            outsideRes();
        });
        self.mutex.set(key, { res: lockResolve, lock });
    }

    async release(key) {
        if (!this.mutex.get(key)) {
            console.error("Release called but no lock exists");
            return;
        }

        this.mutex.get(key).res();
        this.mutex.delete(key);
    }

    async write(key, value) {
        console.log("WRITE", key);
        await this.lock(key);
        this.storage.set(key, value);
        return this.release(key);
    }

    async writeWithTTL(key, value, age = 1000 * 60 * 60) {
        const self = this;
        const existingTimeout = this.ttlTimeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        const timeout = setTimeout(() => {
            self.delete(key);
        }, age);

        this.ttlTimeouts.set(key, timeout);

        await self.write(key, value);
    }

    delete(key) {
        this.mutex.delete(key);
        this.storage.delete(key);
        const existingTimeout = this.ttlTimeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
    }

    get(key) {
        const data = this.storage.get(key);
        console.log("GET", key);
        return data;
    }
}

export default new Memory();
