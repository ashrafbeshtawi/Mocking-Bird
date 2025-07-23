import { TwitterApi } from 'twitter-api-v2';

export const twitterClient = new TwitterApi({
  appKey: process.env.X_API_KEY!,
  appSecret: process.env.X_API_KEY_SECRET!,
  accessToken: process.env.X_ACCESS_TOKEN!,
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
});

export async function tweet(status: string) {
  try {
    const response = await twitterClient.v1.tweet(status);
    return response;
  } catch (error) {
    throw new Error(`Tweet failed: ${(error as Error).message}`);
  }
}
