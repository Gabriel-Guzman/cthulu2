import { confirmCredentials } from '@/discord/spotify';
import { Context } from '@/discord';

afterEach(() => {
    // restore the spy created with spyOn
    jest.restoreAllMocks();
});
describe('confirmCredentials', () => {
    const credentialsGrantResp = () => ({
        body: {
            expires_in: 60,
            access_token: '123',
        },
    });

    it('should not refresh credentials', async () => {
        const {
            body: { access_token: token },
        } = credentialsGrantResp();
        const memGet = jest.fn().mockReturnValueOnce(token);
        const memWriteTtl = jest.fn().mockImplementationOnce(async () => {});

        const spotify = {
            clientCredentialsGrant: jest.fn(async () => credentialsGrantResp()),
            setAccessToken: jest.fn((_: string) => {}),
        };
        const context = {
            redis: {
                get: memGet,
                writeWithTTL: memWriteTtl,
            },
        } as unknown as Context;
        await confirmCredentials(context, spotify);
        expect(spotify.clientCredentialsGrant).toHaveBeenCalledTimes(0);
        expect(spotify.setAccessToken).toHaveBeenCalledWith(token);
        expect(memGet).toHaveBeenCalledTimes(1);
        expect(memGet).toHaveBeenCalledWith('spotify_access_token');
        expect(memWriteTtl).toHaveBeenCalledTimes(0);
    });
    it('should refresh the token', async () => {
        const memGet = jest.fn().mockReturnValueOnce(undefined);
        const memWriteTtl = jest.fn().mockImplementationOnce(() => {});
        const context = {
            redis: {
                get: memGet,
                writeWithTTL: memWriteTtl,
            },
        } as unknown as Context;

        const resp = credentialsGrantResp();

        const spotify = {
            clientCredentialsGrant: jest.fn().mockReturnValueOnce(resp),
            setAccessToken: jest.fn((_: string) => {}),
        };

        await confirmCredentials(context, spotify);
        expect(spotify.clientCredentialsGrant).toHaveBeenCalledTimes(1);
        expect(spotify.setAccessToken).toHaveBeenCalledWith(
            credentialsGrantResp().body.access_token,
        );
    });
});
