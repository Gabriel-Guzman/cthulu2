type QueueItem<T = unknown> = {
    exec: () => Promise<T>;
    resolve?: (arg: T) => void;
    reject?: (err: Error) => void;
};

enum QueueState {
    RUNNING,
    EMPTY,
}

// a queue of items to be executed in order.
class Lane {
    items: QueueItem[] = [];
    state: QueueState = QueueState.EMPTY;

    // add an item to the queue and immediately begin processing if not already
    //  running..
    append(item: QueueItem): void {
        this.items.push(item);
        if (this.state === QueueState.EMPTY) {
            this.run().catch((err) =>
                console.error('error processing checkout lane', err),
            );
        }
    }

    // begin processing the queue, resolving or rejecting each item as it proceses.
    //  rejected items do not stop queue execution.
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

// a container of set of lanes that run in parallel.
export default class Checkout {
    lanes = new Map<string, Lane>();

    // add an item to a lane and immediately execute the lane.
    // returns a promise that resolves or rejects when the queue reaches item "fn"
    //  with the result of "fn".
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
