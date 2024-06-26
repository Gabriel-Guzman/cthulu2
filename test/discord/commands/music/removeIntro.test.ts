import * as db from '@/db';
import { GuildUserInfo, IModels, ServerInfo } from '@/db';
import * as dialog from '@/discord/dialog';
import removeIntro from '@/discord/commands/music/removeIntro';
import { ChatInputCommandInteraction, InteractionType } from 'discord.js';
import { HydratedDocument } from 'mongoose';

afterAll(() => {
    jest.restoreAllMocks();
});

const mockedInteraction = () => {
    const member = {
        id: 'member_id',
        voice: { channel: 'voice_channel' },
    };
    return {
        isApplicationCommand: jest.fn(),
        isChatInputCommand: jest.fn(),
        type: InteractionType.ApplicationCommand,
        options: {
            getString: jest.fn(),
        },
        member,
        reply: jest.fn(),
        guild: {
            id: 'guild_id',
            channels: {
                fetch: jest.fn(),
            },
        },
    };
};

describe('removeIntro', () => {
    it('should update the db removing the intro', async () => {
        const serverInfo = {
            guildId: 'guild_id',
            intros: new Map(),

            save: jest.fn(),
        };
        const userInfo = {
            userId: 'user_id',
        };
        const interaction = mockedInteraction();

        serverInfo.intros.set(interaction.member.id, 'youtube_url');
        const mockedFindOne = jest
            .spyOn(db, 'findOrCreate')
            .mockImplementation(
                async (m) =>
                    (m === GuildUserInfo
                        ? userInfo
                        : serverInfo) as HydratedDocument<IModels>,
            );

        const getDialogMock = jest
            .spyOn(dialog, 'getAffirmativeDialog')
            .mockImplementation(() => 'dialog');

        // const findOne = jest.spyOn(db, "cachedFindOneOrUpsert")
        interaction.isApplicationCommand.mockReturnValueOnce(true);
        interaction.isChatInputCommand.mockReturnValueOnce(true);
        await removeIntro.execute(
            interaction as unknown as ChatInputCommandInteraction,
        );

        expect(mockedFindOne).toHaveBeenNthCalledWith(1, ServerInfo, {
            guildId: interaction.guild.id,
        });
        expect(mockedFindOne).toHaveBeenNthCalledWith(2, GuildUserInfo, {
            guildId: interaction.guild.id,
            userId: interaction.member.id,
        });
        expect(mockedFindOne).toHaveBeenCalledTimes(2);
        expect(serverInfo.intros.get(interaction.member.id)).toBe(undefined);
        expect(serverInfo.save).toHaveBeenCalledTimes(1);
        expect(getDialogMock).toHaveBeenCalledWith(
            'removeIntro',
            interaction.member,
            userInfo,
        );
        expect(interaction.reply).toHaveBeenCalledWith('dialog');
    });
});
