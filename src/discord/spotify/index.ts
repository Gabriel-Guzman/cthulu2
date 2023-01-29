import SpotifyWebApi from "spotify-web-api-node";
import Memory from "@/memory";

function tokenCacheKey(): string {
    return `spotify_access_token`;
}

export async function confirmCredentials(spotifyInstance): Promise<void> {
    const token = Memory.get(tokenCacheKey());
    if (!token) {
        console.debug("refreshing credentials");
        const data = await spotifyInstance.clientCredentialsGrant();
        console.log("data", data);
        await Memory.writeWithTTL(
            tokenCacheKey(),
            token,
            data.body.expires_in * 1000
        );
        spotifyInstance.setAccessToken(data.body.access_token);
    } else {
        spotifyInstance.setAccessToken(token);
    }
}

export default function (): SpotifyWebApi {
    return new SpotifyWebApi({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });
}
