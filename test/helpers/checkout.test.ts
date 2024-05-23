import Checkout from '@/helpers/checkout';

afterEach(() => {
    // restore the spy created with spyOn
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

describe('Checkout', () => {
    describe('placeOrder', () => {
        it('should run placed orders as FIFO', async () => {
            const chk = new Checkout();
            const item1 = jest.fn().mockImplementation(async () => 1);
            const item2 = jest.fn().mockImplementation(async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
                return 2;
            });
            const item3 = jest.fn().mockImplementation(async () => 3);

            const x1 = await chk.placeOrder('1', item1);
            const x2 = await chk.placeOrder('1', item2);
            const x3 = await chk.placeOrder('1', item3);

            const x1Order = item1.mock.invocationCallOrder[0];
            const x2Order = item2.mock.invocationCallOrder[0];
            const x3Order = item3.mock.invocationCallOrder[0];
            expect(x1Order).toBeLessThan(x2Order);
            expect(x2Order).toBeLessThan(x3Order);
            expect(x1).toEqual(1);
            expect(x2).toEqual(2);
            expect(x3).toEqual(3);
        });

        it('should raise error only on errored order promise', async () => {
            const chk = new Checkout();
            const item1 = jest.fn().mockImplementation(async () => 1);
            const item2 = async () => {
                throw new Error('error');
            };
            const item3 = jest.fn().mockImplementation(async () => 3);

            const x1 = await chk.placeOrder('1', item1);
            await expect(
                async () => await chk.placeOrder('1', item2),
            ).rejects.toThrow();
            const x3 = await chk.placeOrder('1', item3);
        });
    });
});
