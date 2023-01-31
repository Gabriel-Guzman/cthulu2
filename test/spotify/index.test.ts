import Memory from "@/memory";
import { confirmCredentials } from "@/discord/spotify";

afterEach(() => {
    // restore the spy created with spyOn
    jest.restoreAllMocks();
});
describe("confirmCredentials", () => {
    const credentialsGrantResp = () => ({
        body: {
            expires_in: 60,
            access_token: "123",
        },
    });

    it("should not refresh credentials", async () => {
        const {
            body: { access_token: token },
        } = credentialsGrantResp();
        const memGet = jest.spyOn(Memory, "get").mockReturnValueOnce(token);
        const memWriteTtl = jest
            .spyOn(Memory, "writeWithTTL")
            .mockImplementationOnce(async () => {});

        const spotify = {
            clientCredentialsGrant: jest.fn(async () => credentialsGrantResp()),
            setAccessToken: jest.fn((_: string) => {}),
        };
        await confirmCredentials(spotify);
        expect(spotify.clientCredentialsGrant).toHaveBeenCalledTimes(0);
        expect(spotify.setAccessToken).toHaveBeenCalledWith(token);
        expect(memGet).toHaveBeenCalledTimes(1);
        expect(memGet).toHaveBeenCalledWith("spotify_access_token");
        expect(memWriteTtl).toHaveBeenCalledTimes(0);
    });
    it("should refresh the token", async () => {
        jest.spyOn(Memory, "get").mockReturnValueOnce(undefined);
        jest.spyOn(Memory, "writeWithTTL").mockImplementationOnce(
            async () => {}
        );

        const resp = credentialsGrantResp();

        const spotify = {
            clientCredentialsGrant: jest.fn().mockReturnValueOnce(resp),
            setAccessToken: jest.fn((_: string) => {}),
        };

        await confirmCredentials(spotify);
        expect(spotify.clientCredentialsGrant).toHaveBeenCalledTimes(1);
        expect(spotify.setAccessToken).toHaveBeenCalledWith(
            credentialsGrantResp().body.access_token
        );
    });
});
