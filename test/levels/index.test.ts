import { calculateLevel, incrementUserXp } from '@/levels';
import { IGuildUserInfo } from '@/db';
import { HydratedDocument } from 'mongoose';
import { GuildMember, TextChannel } from 'discord.js';

describe('levels', () => {
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
            } as unknown as HydratedDocument<IGuildUserInfo>;
            const channel = {
                send: jest.fn(),
            };
            await incrementUserXp(
                userInfo,
                {} as unknown as GuildMember,
                channel as unknown as TextChannel,
                9,
            );
            expect(userInfo.save).toHaveBeenCalledTimes(1);
            expect(channel.send).toHaveBeenCalledTimes(1);
        });
    });
});
