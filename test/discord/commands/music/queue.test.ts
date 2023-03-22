import queue from '@/discord/commands/music/queue';
import * as aqm from '@/audio/aqm';
import * as db from '@/db';
import * as utils from '@/discord/commands/music/util';
import * as dialog from '@/discord/dialog';
import { InteractionType } from 'discord.js';

const mockedInteraction = () => {
    const member = {
        voice: { channel: 'voicechannel' },
    };
    return {
        isApplicationCommand: jest.fn(),
        isCommand: jest.fn(),
        type: InteractionType.ApplicationCommand,

        options: {
            getString: jest.fn(),
        },
        member,
        reply: jest.fn(),
        guild: {
            channels: {
                fetch: jest.fn(),
            },
        },
    };
};

afterEach(() => {
    // restore the spy created with spyOn
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

describe('queue.run', () => {
    it("should tell the user they're not in the right voice channel", async () => {
        const member = {
            voice: { channel: undefined },
        };
        const interaction = {
            isChatInputCommand: jest.fn().mockReturnValueOnce(true),
            type: InteractionType.ApplicationCommand,
            options: {
                getString: jest.fn().mockReturnValueOnce('happy'),
            },
            member,
            reply: jest.fn(),
            guild: {
                channels: {
                    fetch: jest.fn().mockReturnValueOnce('123'),
                },
            },
        };

        // @ts-ignore
        await queue.run(member, interaction);
        expect(interaction.isChatInputCommand).toHaveBeenCalledTimes(1);
        expect(interaction.options.getString).toHaveBeenCalledTimes(1);
        expect(interaction.options.getString).toHaveBeenCalledWith('query');
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.anything(),
                ephemeral: true,
            }),
        );
    });
    it('should queue the music and tell the user', async () => {
        const member = {
            id: 'member_id',
            voice: { channel: { id: 'voice_channel_id' } },
        };
        const interaction = {
            isChatInputCommand: jest.fn().mockReturnValueOnce(true),
            type: InteractionType.ApplicationCommand,
            options: {
                getString: jest.fn().mockReturnValueOnce('happy'),
            },
            member,
            reply: jest.fn(),
            guild: {
                channels: {
                    fetch: jest.fn().mockReturnValueOnce('123'),
                },
            },
        };

        const aqmQueueSpy = jest
            .spyOn(aqm.AQM, 'queue')
            .mockImplementation(async () => undefined);

        const buildPayloadSpy = jest
            .spyOn(utils, 'buildPayload')
            .mockImplementation(
                async () => new aqm.YoutubePayload('url', 'title', member.id),
            );

        const findOneSpy = jest
            .spyOn(db, 'cachedFindOneOrUpsert')
            // @ts-ignore
            .mockImplementationOnce(async () => ({
                guildId: '123',
            }))

            // @ts-ignore
            .mockImplementationOnce(async () => ({ userId: '123' }));

        const dialogSpy = jest
            .spyOn(dialog, 'getAffirmativeDialog')
            .mockImplementation(() => 'asdfalkjsdf');

        // @ts-ignore
        await queue.run(undefined, interaction);

        expect(findOneSpy).toHaveBeenCalledTimes(2);
        expect(buildPayloadSpy).toHaveBeenCalledWith('happy', member.id);
        expect(aqmQueueSpy).toHaveBeenCalledTimes(1);
        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(dialogSpy).toHaveBeenCalledTimes(1);
        expect(dialogSpy).toHaveBeenCalledWith('queue', interaction.member, {
            userId: '123',
        });
    });
});
