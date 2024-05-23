export interface IMemory<K, V> {
    write(key: K, value: V): Promise<void> | void;

    writeWithTTL(key: K, value: V, age: number): Promise<void> | void;

    delete(key: K): Promise<void> | void;

    get(key: K): Promise<V> | V;
}
