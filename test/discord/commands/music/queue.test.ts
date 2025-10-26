import queue from '@/discord/commands/music/queue';
import * as aqm from '@/audio/aqm';
import * as db from '@/db';
import { IGuildUserInfo, IServerInfo } from '@/db';
import * as utils from '@/discord/commands/music/util';
import * as dialog from '@/discord/dialog';
import * as payload from '@/discord/commands/payload';
import { CommandBasePayload } from '@/discord/commands/payload';
import { ChatInputCommandInteraction, InteractionType } from 'discord.js';
import { HydratedDocument } from 'mongoose';
import { Context } from '@/discord';

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
        await queue.validate(
            {} as unknown as Context,
            interaction as unknown as ChatInputCommandInteraction,
        );
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.anything(),
                ephemeral: true,
            }),
        );
    });
    it('should queue the music', async () => {
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
                id: '124',
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
            .mockImplementation(async () => [
                new aqm.YoutubePayload('url', 'title', member.id, '', ''),
            ]);

        const findOneSpy = jest
            .spyOn(db, 'findOrCreate')
            .mockImplementationOnce(
                async () =>
                    ({
                        guildId: '123',
                    } as unknown as Promise<HydratedDocument<IServerInfo>>),
            )
            .mockImplementationOnce(
                async () =>
                    ({ userId: '123' } as unknown as Promise<
                        HydratedDocument<IGuildUserInfo>
                    >),
            );

        const dialogSpy = jest
            .spyOn(dialog, 'getAffirmativeDialog')
            .mockImplementation(() => 'asdfalkjsdf');

        jest.spyOn(payload, 'hydrateCommandPayload').mockImplementation(
            async () =>
                ({
                    member,
                    guild: interaction.guild,
                } as unknown as CommandBasePayload),
        );

        const client = {};
        await queue.execute({ client } as unknown as Context, {
            member: member.id,
            guild: interaction.guild.id,
            query: 'happy',
        });

        expect(findOneSpy).toHaveBeenCalledTimes(2);
        expect(buildPayloadSpy).toHaveBeenCalledWith(
            { client },
            'happy',
            member.id,
        );
        expect(aqmQueueSpy).toHaveBeenCalledTimes(1);
        expect(dialogSpy).toHaveBeenCalledTimes(1);
        expect(dialogSpy).toHaveBeenCalledWith('queue', interaction.member, {
            userId: '123',
        });
    });
});
