import { calculateLevel, incrementUserXp } from '@/levels';

describe('calculateLevel', () => {
    it('should return runescape levels', async () => {
        expect(calculateLevel(83)).toBe(1);
        expect(calculateLevel(92)).toBe(2);
    });
    it('should throw an error', () => {
        expect(() => calculateLevel(0)).toThrow();
    });
});

describe('incrementUserXp', () => {
    it('should increment level and notify', async () => {
        const userInfo = {
            save: jest.fn(),
            xp: 83,
            lastLevelCongratulated: 1,
        };
        const channel = {
            send: jest.fn(),
        };
        // @ts-ignore
        await incrementUserXp(userInfo, {}, channel, 9);
        expect(userInfo.save).toHaveBeenCalledTimes(1);
        expect(channel.send).toHaveBeenCalledTimes(1);
    });
});
