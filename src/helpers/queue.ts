type QueueItem<T = unknown> = {
    exec: () => Promise<T>;
    resolve?: (arg: T) => void;
    reject?: (err: Error) => void;
};

enum QueueState {
    RUNNING,
    EMPTY,
}

class Lane {
    items: QueueItem[] = [];
    state: QueueState = QueueState.EMPTY;

    append(item: QueueItem): void {
        this.items.push(item);
        if (this.state === QueueState.EMPTY) {
            this.run();
        }
    }

    private async run(): Promise<void> {
        this.state = QueueState.RUNNING;
        let item: QueueItem;
        while ((item = this.items.shift())) {
            try {
                const resp = await item.exec();
                if (item.resolve) item.resolve(resp);
            } catch (err) {
                if (item.reject) item.reject(err);
            }
        }
        this.state = QueueState.EMPTY;
    }
}

export default class Checkout {
    lanes = new Map<string, Lane>();
    placeOrder<T>(laneId: string, fn: () => Promise<T>): Promise<T> {
        let lane = this.lanes.get(laneId);
        if (!lane) {
            lane = new Lane();
            this.lanes.set(laneId, lane);
        }
        return new Promise<T>((res, rej) => {
            lane.append({
                exec: fn,
                resolve: res,
                reject: rej,
            });
        });
    }
}
