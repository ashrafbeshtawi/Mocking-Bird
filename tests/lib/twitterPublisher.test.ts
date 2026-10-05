const mockTweet = jest.fn();

jest.mock('twitter-api-v2', () => {
  const actual = jest.requireActual('twitter-api-v2');
  return { ...actual, TwitterApi: jest.fn(() => ({ v2: { tweet: mockTweet } })) };
});

import { ApiResponseError } from 'twitter-api-v2';
import type { Pool } from 'pg';
import { TwitterPublisherV1 } from '@/lib/publishers/twitterv1.1';

const account = { x_user_id: '42', username: 'ByteSizedAINews', oauth_token: 't', oauth_token_secret: 's' };

const apiError = (code: number, data: object) =>
  new ApiResponseError(`Request failed with code ${code}`, {
    code,
    data,
    headers: {},
    rateLimit: undefined,
    request: {} as never,
    response: { headers: {} } as never,
  });

describe('TwitterPublisherV1 failure messages', () => {
  const originalEnv = process.env;
  let publisher: TwitterPublisherV1;

  beforeAll(() => {
    process.env = { ...originalEnv, X_API_KEY: 'key', X_API_KEY_SECRET: 'secret' };
    publisher = new TwitterPublisherV1({} as Pool);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    mockTweet.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('reports the title and detail of an X problem response', async () => {
    mockTweet.mockRejectedValue(
      apiError(402, { title: 'CreditsDepleted', detail: 'Your enrolled account does not have any credits.' })
    );

    const { failed } = await publisher.publishToAccounts('hello', [account]);

    expect(failed).toEqual([
      expect.objectContaining({
        account_id: '42',
        error: expect.objectContaining({
          message: 'CreditsDepleted: Your enrolled account does not have any credits.',
          code: '402',
        }),
      }),
    ]);
  });

  it('reports the first entry of an X errors array', async () => {
    mockTweet.mockRejectedValue(apiError(403, { errors: [{ message: 'Duplicate content', code: 187 }] }));

    const { failed } = await publisher.publishToAccounts('hello', [account]);

    expect(failed[0].error).toEqual(expect.objectContaining({ message: 'Duplicate content', code: '187' }));
  });

  it('falls back to the error message for other failures', async () => {
    mockTweet.mockRejectedValue(new Error('socket hang up'));

    const { failed } = await publisher.publishToAccounts('hello', [account]);

    expect(failed[0].error.message).toBe('socket hang up');
  });
});
