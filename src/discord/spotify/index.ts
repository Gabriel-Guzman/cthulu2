import SpotifyWebApi from 'spotify-web-api-node';
import { Context } from '@/discord';

const SPOTIFY_CACHE_KEY = 'spotify_access_token';

export async function confirmCredentials(
    ctx: Context,
    spotifyInstance,
): Promise<void> {
    const token: string = await ctx.redis.get(SPOTIFY_CACHE_KEY);
    console.debug('got spotify token from redis:', token);
    if (!token) {
        console.debug('refreshing credentials');
        const data = await spotifyInstance.clientCredentialsGrant();

        console.debug('response from spotify', data);
        await ctx.redis.writeWithTTL(
            SPOTIFY_CACHE_KEY,
            data.body.access_token,
            data.body.expires_in,
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
