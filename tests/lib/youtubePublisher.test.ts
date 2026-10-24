import type { Pool } from 'pg';
import { YouTubePublisher, revokeYouTubeTokens, videoMetadata, type YouTubeChannelToken } from '@/lib/publishers/youtube';
import type { CloudinaryMediaInfo } from '@/lib/publish/types';

const channel = (expiresInMs: number): YouTubeChannelToken => ({
  channel_id: 'UC123',
  title: 'Ada Videos',
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: new Date(Date.now() + expiresInMs),
});

const video: CloudinaryMediaInfo = {
  publicId: 'vid1',
  publicUrl: 'https://res.cloudinary.com/vid1.mp4',
  resourceType: 'video',
  format: 'mp4',
  originalFilename: 'launch-day.mp4',
};

const json = (body: object) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('videoMetadata', () => {
  it('uses the title as given and the post text as the description', () => {
    expect(videoMetadata(' Launch day ', 'We shipped <it>.', 'clip.mp4')).toEqual({
      title: 'Launch day',
      description: 'We shipped ‹it›.',
    });
  });

  it('titles the video with its file name when the title is blank', () => {
    expect(videoMetadata('', '', 'launch-day.mp4')).toEqual({ title: 'launch-day', description: '' });
  });

  it('cuts the title to 100 characters', () => {
    expect(videoMetadata('a'.repeat(150), '', 'clip.mp4').title).toHaveLength(100);
  });
});

describe('YouTubePublisher', () => {
  let query: jest.Mock;
  let publisher: YouTubePublisher;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue({ rows: [] });
    publisher = new YouTubePublisher({ query } as unknown as Pool);
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const u = String(url);
      if (u === video.publicUrl) return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'video/mp4' } });
      if (u.startsWith('https://www.googleapis.com/upload/')) {
        return new Response(null, { status: 200, headers: { location: 'https://upload.youtube/session' } });
      }
      if (u === 'https://upload.youtube/session') return json({ id: 'vid-42' });
      if (u === 'https://oauth2.googleapis.com/token') return json({ access_token: 'fresh', expires_in: 3599 });
      throw new Error(`unexpected fetch ${u}`);
    });
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  const callTo = (prefix: string) => fetchMock.mock.calls.find(([url]) => String(url).startsWith(prefix));

  it('uploads the video as private with the post text as its metadata', async () => {
    const { successful, failed } = await publisher.publishToAccounts(
      { title: 'Launch day', text: 'We shipped it.', cloudinaryMedia: [video] },
      [channel(3_600_000)]
    );

    expect(failed).toEqual([]);
    expect(successful).toEqual([{ platform: 'youtube', account_id: 'UC123', name: 'Ada Videos', post_id: 'vid-42' }]);
    const [, init] = callTo('https://www.googleapis.com/upload/');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer access', 'X-Upload-Content-Length': '3' });
    expect(JSON.parse(init.body)).toEqual({
      snippet: { title: 'Launch day', description: 'We shipped it.' },
      status: { privacyStatus: 'private', selfDeclaredMadeForKids: false },
    });
    expect(callTo('https://oauth2.googleapis.com/token')).toBeUndefined();
  });

  it('refreshes and stores an access token that is about to expire', async () => {
    await publisher.publishToAccounts({ title: '', text: '', cloudinaryMedia: [video] }, [channel(60_000)]);

    expect(callTo('https://oauth2.googleapis.com/token')).toBeDefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE connected_youtube_channels'), ['fresh', 3599, 'UC123', 'refresh']);
    expect(callTo('https://www.googleapis.com/upload/')[1].headers.Authorization).toBe('Bearer fresh');
  });

  it('asks to reconnect when the refresh token is rejected', async () => {
    fetchMock.mockImplementation(async () => new Response('{"error":"invalid_grant"}', { status: 400 }));

    const { failed } = await publisher.publishToAccounts({ title: '', text: '', cloudinaryMedia: [video] }, [channel(0)]);

    expect(failed[0].error.message).toMatch(/Reconnect the channel/);
  });

  it('fails a post that is not exactly one video', async () => {
    const { failed } = await publisher.publishToAccounts({ title: '', text: 'hi', cloudinaryMedia: [video, video] }, [channel(3_600_000)]);

    expect(failed[0].error.message).toBe('YouTube uploads take exactly one video.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('with a custom thumbnail', () => {
    const thumbnailUrl = 'https://res.cloudinary.com/thumb1.jpg';
    const withThumbnail = { ...video, thumbnail: { publicId: 'thumb1', publicUrl: thumbnailUrl } };
    const thumbnailCall = () => callTo('https://www.googleapis.com/upload/youtube/v3/thumbnails/set');

    beforeEach(() => {
      const uploadMock = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation(async (url, init) =>
        String(url) === thumbnailUrl ? new Response(new Uint8Array([9, 9])) : uploadMock(url, init)
      );
    });

    it('sets the thumbnail on the uploaded video', async () => {
      const { successful } = await publisher.publishToAccounts(
        { title: '', text: '', cloudinaryMedia: [withThumbnail] },
        [channel(3_600_000)]
      );

      expect(successful).toEqual([{ platform: 'youtube', account_id: 'UC123', name: 'Ada Videos', post_id: 'vid-42' }]);
      const [url, init] = thumbnailCall();
      expect(url).toBe('https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=vid-42&uploadType=media');
      expect(init.headers).toMatchObject({ Authorization: 'Bearer access', 'Content-Type': 'image/jpeg' });
      expect(new Uint8Array(init.body)).toEqual(new Uint8Array([9, 9]));
    });

    it('keeps the upload and warns when the channel cannot use custom thumbnails', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const thumbnailMock = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation(async (url, init) =>
        String(url).includes('/thumbnails/set') ? new Response('{}', { status: 403 }) : thumbnailMock(url, init)
      );

      const { successful, failed } = await publisher.publishToAccounts(
        { title: '', text: '', cloudinaryMedia: [withThumbnail] },
        [channel(3_600_000)]
      );

      expect(failed).toEqual([]);
      expect(successful[0].post_id).toBe('vid-42');
      expect(successful[0].warning).toMatch(/thumbnail was not set: This channel cannot use custom thumbnails yet/);
    });
  });
});

describe('revokeYouTubeTokens', () => {
  afterEach(() => jest.restoreAllMocks());

  it('revokes each refresh token at Google', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

    await revokeYouTubeTokens(['r1', 'r2']);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/revoke');
    expect(String(init?.body)).toBe('token=r1');
  });

  it('resolves when Google rejects or is unreachable', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 400 }))
      .mockRejectedValueOnce(new Error('offline'));

    await expect(revokeYouTubeTokens(['r1', 'r2'])).resolves.toBeUndefined();
  });
});
