import type { Pool } from 'pg';
import {
  TikTokPublisher,
  TIKTOK_STILL_PROCESSING_WARNING,
  chunkPlan,
  revokeTikTokTokens,
  type TikTokAccountToken,
} from '@/lib/publishers/tiktok';
import { EMPTY_TIKTOK_SETTINGS, type TikTokPostSettings } from '@/lib/tiktok';
import type { CloudinaryMediaInfo } from '@/lib/publish/types';

const MB = 1024 * 1024;

const account = (expiresInMs: number): TikTokAccountToken => ({
  open_id: 'oid-1',
  display_name: 'Ada Dances',
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: new Date(Date.now() + expiresInMs),
});

const video: CloudinaryMediaInfo = {
  publicId: 'vid1',
  publicUrl: 'https://res.cloudinary.com/vid1.mp4',
  resourceType: 'video',
  format: 'mp4',
  originalFilename: 'dance.mp4',
};

const settings: TikTokPostSettings = { ...EMPTY_TIKTOK_SETTINGS, privacyLevel: 'SELF_ONLY', allowComment: true };

const creatorData = {
  creator_nickname: 'ada',
  privacy_level_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
  comment_disabled: false,
  duet_disabled: true,
  stitch_disabled: false,
  max_video_post_duration_sec: 600,
};

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('chunkPlan', () => {
  it('sends a video of up to 64 MB as one chunk', () => {
    expect(chunkPlan(3)).toEqual({ chunkSize: 3, totalChunkCount: 1 });
    expect(chunkPlan(64 * MB)).toEqual({ chunkSize: 64 * MB, totalChunkCount: 1 });
  });

  it('splits a larger video into 10 MB chunks, the last one carrying the remainder', () => {
    expect(chunkPlan(64 * MB + 1)).toEqual({ chunkSize: 10 * MB, totalChunkCount: 6 });
    expect(chunkPlan(100 * MB)).toEqual({ chunkSize: 10 * MB, totalChunkCount: 10 });
  });
});

describe('TikTokPublisher', () => {
  let query: jest.Mock;
  let publisher: TikTokPublisher;
  let fetchMock: jest.SpyInstance;
  /** Raw JSON bodies the status endpoint returns, one per poll; the last one repeats. */
  let statusBodies: string[];

  const statusBody = (data: object) => JSON.stringify({ data, error: { code: 'ok' } });

  beforeEach(() => {
    query = jest.fn().mockResolvedValue({ rows: [] });
    publisher = new TikTokPublisher({ query } as unknown as Pool, { intervalMs: 0, timeoutMs: 1_000 });
    statusBodies = [statusBody({ status: 'PUBLISH_COMPLETE' })];
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const u = String(url);
      if (u === video.publicUrl) return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'video/mp4' } });
      if (u.endsWith('/v2/post/publish/creator_info/query/')) return json({ data: creatorData, error: { code: 'ok' } });
      if (u.endsWith('/v2/post/publish/video/init/')) {
        return json({ data: { publish_id: 'pub-42', upload_url: 'https://upload.tiktok/session' }, error: { code: 'ok' } });
      }
      if (u === 'https://upload.tiktok/session') return new Response(null, { status: 201 });
      if (u.endsWith('/v2/post/publish/status/fetch/')) {
        const body = statusBodies.length > 1 ? statusBodies.shift()! : statusBodies[0];
        return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (u.endsWith('/v2/oauth/token/')) return json({ access_token: 'fresh', refresh_token: 'rotated', expires_in: 86400 });
      throw new Error(`unexpected fetch ${u}`);
    });
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  const callTo = (suffix: string) => fetchMock.mock.calls.find(([url]) => String(url).endsWith(suffix));

  it('posts the video with the chosen settings and the post text as caption', async () => {
    const { successful, failed } = await publisher.publishToAccounts(
      { text: 'Watch this', settings, cloudinaryMedia: [video] },
      [account(3_600_000)]
    );

    expect(failed).toEqual([]);
    expect(successful).toEqual([{ platform: 'tiktok', account_id: 'oid-1', name: 'Ada Dances', post_id: 'pub-42' }]);
    const [, init] = callTo('/v2/post/publish/video/init/');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer access' });
    expect(JSON.parse(init.body)).toEqual({
      post_info: {
        title: 'Watch this',
        privacy_level: 'SELF_ONLY',
        disable_comment: false,
        // The account has duets turned off, so they stay off.
        disable_duet: true,
        disable_stitch: true,
        brand_organic_toggle: false,
        brand_content_toggle: false,
      },
      source_info: { source: 'FILE_UPLOAD', video_size: 3, chunk_size: 3, total_chunk_count: 1 },
    });
    const [, upload] = callTo('https://upload.tiktok/session');
    expect(upload.method).toBe('PUT');
    expect(upload.headers).toMatchObject({ 'Content-Range': 'bytes 0-2/3', 'Content-Type': 'video/mp4' });
  });

  it('waits for TikTok to publish and stores the public post id, keeping its 64-bit precision', async () => {
    statusBodies = [
      statusBody({ status: 'PROCESSING_UPLOAD' }),
      statusBody({ status: 'PROCESSING_DOWNLOAD' }),
      // Raw JSON: a post id beyond Number.MAX_SAFE_INTEGER must not be rounded.
      '{"data":{"status":"PUBLISH_COMPLETE","publicaly_available_post_id":[7301234567890123456]},"error":{"code":"ok"}}',
    ];

    const { successful, failed } = await publisher.publishToAccounts(
      { text: '', settings: { ...settings, privacyLevel: 'PUBLIC_TO_EVERYONE' }, cloudinaryMedia: [video] },
      [account(3_600_000)]
    );

    expect(failed).toEqual([]);
    expect(successful).toEqual([
      { platform: 'tiktok', account_id: 'oid-1', name: 'Ada Dances', post_id: '7301234567890123456' },
    ]);
    const statusCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/v2/post/publish/status/fetch/'));
    expect(statusCalls).toHaveLength(3);
    expect(JSON.parse(statusCalls[0][1].body)).toEqual({ publish_id: 'pub-42' });
  });

  it('fails the post with TikTok\'s reason when TikTok rejects the video after the upload', async () => {
    statusBodies = [
      statusBody({ status: 'PROCESSING_UPLOAD' }),
      statusBody({ status: 'FAILED', fail_reason: 'spam_risk_too_many_posts' }),
    ];

    const { successful, failed } = await publisher.publishToAccounts(
      { text: '', settings, cloudinaryMedia: [video] },
      [account(3_600_000)]
    );

    expect(successful).toEqual([]);
    expect(failed).toEqual([
      {
        platform: 'tiktok',
        account_id: 'oid-1',
        name: 'Ada Dances',
        error: {
          message:
            'TikTok rejected the video (spam_risk_too_many_posts): The account has reached TikTok\'s daily post limit. Try again tomorrow.',
        },
      },
    ]);
  });

  it('names an unknown fail_reason as is', async () => {
    statusBodies = [statusBody({ status: 'FAILED', fail_reason: 'something_new' })];

    const { failed } = await publisher.publishToAccounts({ text: '', settings, cloudinaryMedia: [video] }, [account(3_600_000)]);

    expect(failed[0].error.message).toBe('TikTok rejected the video (something_new)');
  });

  it('reports success with a note when TikTok is still processing at the deadline', async () => {
    publisher = new TikTokPublisher({ query } as unknown as Pool, { intervalMs: 1, timeoutMs: 20 });
    statusBodies = [statusBody({ status: 'PROCESSING_DOWNLOAD' })];

    const { successful, failed } = await publisher.publishToAccounts(
      { text: '', settings, cloudinaryMedia: [video] },
      [account(3_600_000)]
    );

    expect(failed).toEqual([]);
    expect(successful).toEqual([
      { platform: 'tiktok', account_id: 'oid-1', name: 'Ada Dances', post_id: 'pub-42', warning: TIKTOK_STILL_PROCESSING_WARNING },
    ]);
  });

  it('does not fail an uploaded post when the status check itself errors', async () => {
    publisher = new TikTokPublisher({ query } as unknown as Pool, { intervalMs: 1, timeoutMs: 20 });
    statusBodies = [JSON.stringify({ error: { code: 'internal_error', message: 'oops' } })];

    const { successful, failed } = await publisher.publishToAccounts(
      { text: '', settings, cloudinaryMedia: [video] },
      [account(3_600_000)]
    );

    expect(failed).toEqual([]);
    expect(successful[0].warning).toBe(TIKTOK_STILL_PROCESSING_WARNING);
  });

  it('rejects a video longer than the account allows before starting the upload', async () => {
    const { successful, failed } = await publisher.publishToAccounts(
      { text: '', settings, cloudinaryMedia: [{ ...video, duration: 600.4 }] },
      [account(3_600_000)]
    );

    expect(successful).toEqual([]);
    expect(failed[0].error.message).toBe(
      'The video is 601 seconds long, but TikTok allows at most 600 seconds for this account.'
    );
    expect(callTo('/v2/post/publish/video/init/')).toBeUndefined();
    expect(callTo(video.publicUrl)).toBeUndefined();
  });

  it('posts a video within the allowed length', async () => {
    const { failed } = await publisher.publishToAccounts(
      { text: '', settings, cloudinaryMedia: [{ ...video, duration: 600 }] },
      [account(3_600_000)]
    );

    expect(failed).toEqual([]);
  });

  it('refreshes an expiring token and stores the rotated refresh token', async () => {
    await publisher.publishToAccounts({ text: '', settings, cloudinaryMedia: [video] }, [account(60_000)]);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE connected_tiktok_accounts'),
      ['fresh', 'rotated', 86400, 'oid-1', 'refresh']
    );
    expect(callTo('/v2/post/publish/video/init/')[1].headers.Authorization).toBe('Bearer fresh');
  });

  it('fails a visibility the account does not offer', async () => {
    const { failed } = await publisher.publishToAccounts(
      { text: '', settings: { ...settings, privacyLevel: 'FOLLOWER_OF_CREATOR' }, cloudinaryMedia: [video] },
      [account(3_600_000)]
    );

    expect(failed[0].error.message).toMatch(/does not allow the chosen visibility/);
    expect(callTo('/v2/post/publish/video/init/')).toBeUndefined();
  });

  it('surfaces TikTok\'s reason when it refuses the post', async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith('/creator_info/query/')
        ? json({ error: { code: 'reached_active_user_cap', message: 'Daily active user cap reached' } }, 200)
        : new Response(null, { status: 500 })
    );

    const { failed } = await publisher.publishToAccounts({ text: '', settings, cloudinaryMedia: [video] }, [account(3_600_000)]);

    expect(failed[0].error.message).toBe(
      "TikTok could not read the account's posting options (HTTP 200, reached_active_user_cap): Daily active user cap reached"
    );
  });

  it('explains the daily post limit in plain words', async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith('/creator_info/query/')
        ? json({ error: { code: 'spam_risk_too_many_posts', message: 'Daily post cap reached' } }, 200)
        : new Response(null, { status: 500 })
    );

    const { failed } = await publisher.publishToAccounts({ text: '', settings, cloudinaryMedia: [video] }, [account(3_600_000)]);

    expect(failed[0].error.message).toBe(
      "TikTok could not read the account's posting options (HTTP 200, spam_risk_too_many_posts): " +
      "The account has reached TikTok's daily post limit. Try again tomorrow."
    );
  });

  it('explains the sandbox restriction instead of TikTok\'s generic guidelines message', async () => {
    const init = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) =>
      String(url).endsWith('/v2/post/publish/video/init/')
        ? json({
            error: {
              code: 'unaudited_client_can_only_post_to_private_accounts',
              message: 'Please review our integration guidelines at https://developers.tiktok.com/doc/content-sharing-guidelines/',
            },
          }, 403)
        : init(url, options)
    );

    const { failed } = await publisher.publishToAccounts({ text: '', settings, cloudinaryMedia: [video] }, [account(3_600_000)]);

    expect(failed[0].error.message).toBe(
      'TikTok could not start the upload (HTTP 403, unaudited_client_can_only_post_to_private_accounts): ' +
      'Until TikTok has audited this app, it can only post to private TikTok accounts. ' +
      'Make the account private in the TikTok app (Settings and privacy → Privacy → Private account) and choose "Only me".'
    );
  });

  it('fails without settings or with anything but one video, before calling TikTok', async () => {
    const noPrivacy = await publisher.publishToAccounts(
      { text: '', settings: EMPTY_TIKTOK_SETTINGS, cloudinaryMedia: [video] },
      [account(3_600_000)]
    );
    const twoVideos = await publisher.publishToAccounts({ text: '', settings, cloudinaryMedia: [video, video] }, [account(3_600_000)]);

    expect(noPrivacy.failed[0].error.message).toBe('Choose who can view the TikTok post.');
    expect(twoVideos.failed[0].error.message).toBe('TikTok posts take exactly one video.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('revokeTikTokTokens', () => {
  afterEach(() => jest.restoreAllMocks());

  it('revokes a live access token, refreshing an expired one first', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url) =>
      String(url).endsWith('/v2/oauth/token/')
        ? json({ access_token: 'fresh', refresh_token: 'r2', expires_in: 86400 })
        : new Response(null, { status: 200 })
    );

    await revokeTikTokTokens([
      { access_token: 'live', refresh_token: 'r', expires_at: new Date(Date.now() + 60_000) },
      { access_token: 'stale', refresh_token: 'r', expires_at: new Date(Date.now() - 60_000) },
    ]);

    const revoked = fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith('/v2/oauth/revoke/'))
      .map(([, init]) => new URLSearchParams(String(init?.body)).get('token'));
    expect(revoked.sort()).toEqual(['fresh', 'live']);
  });

  it('resolves when TikTok is unreachable', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));

    await expect(
      revokeTikTokTokens([{ access_token: 'a', refresh_token: 'r', expires_at: new Date(Date.now() + 60_000) }])
    ).resolves.toBeUndefined();
  });
});
