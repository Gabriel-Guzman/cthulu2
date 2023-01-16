import SpotifyWebApi from "spotify-web-api-node";

let expires;

const Spotify = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

export async function confirmCredentials(spotifyInstance) {
  if (!expires || expires < new Date()) {
    console.log("refreshing credentials");
    const data = await spotifyInstance.clientCredentialsGrant();
    const now = new Date();
    now.setSeconds(now.getSeconds() + data.body.expires_in);
    expires = now;
    spotifyInstance.setAccessToken(data.body.access_token);
  }
}
export default Spotify;
