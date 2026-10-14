import type { Pool } from 'pg';
import { LinkedInPublisher, escapeCommentary, type LinkedInAccountToken } from '@/lib/publishers/linkedin';
import type { CloudinaryMediaInfo } from '@/lib/publish/types';

const account: LinkedInAccountToken = {
  linkedin_user_id: 'abc123',
  name: 'Ada Lovelace',
  access_token: 'token',
  expires_at: new Date(Date.now() + 86_400_000),
};

const image = (n: number): CloudinaryMediaInfo => ({
  publicId: `img${n}`,
  publicUrl: `https://res.cloudinary.com/img${n}.jpg`,
  resourceType: 'image',
  format: 'jpg',
  originalFilename: `img${n}.jpg`,
});

const json = (body: object, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });

describe('LinkedInPublisher', () => {
  const publisher = new LinkedInPublisher({} as Pool);
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  const postBody = () => {
    const call = fetchMock.mock.calls.find(([url]) => url === 'https://api.linkedin.com/rest/posts');
    return JSON.parse(call[1].body);
  };

  it('publishes a text post as the member and returns the post URN', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:1' } }));

    const { successful, failed } = await publisher.publishToAccounts({ text: 'Hello (world) #news' }, [account]);

    expect(failed).toEqual([]);
    expect(successful).toEqual([{ platform: 'linkedin', account_id: 'abc123', name: 'Ada Lovelace', post_id: 'urn:li:share:1' }]);
    expect(postBody()).toMatchObject({
      author: 'urn:li:person:abc123',
      commentary: 'Hello \\(world\\) \\#news',
      lifecycleState: 'PUBLISHED',
    });
    expect(postBody().content).toBeUndefined();
  });

  it('uploads each image and attaches them as a multi-image post', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('initializeUpload')) {
        const n = fetchMock.mock.calls.filter(([u]) => String(u).includes('initializeUpload')).length;
        return json({ value: { uploadUrl: `https://upload/${n}`, image: `urn:li:image:${n}` } });
      }
      if (url.startsWith('https://res.cloudinary.com')) return new Response('bytes');
      if (url.startsWith('https://upload/')) return new Response(null, { status: 201 });
      return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:2' } });
    });

    const { successful } = await publisher.publishToAccounts({ text: '', cloudinaryMedia: [image(1), image(2)] }, [account]);

    expect(successful).toHaveLength(1);
    expect(postBody().content.multiImage.images.map((i: { id: string }) => i.id).sort()).toEqual([
      'urn:li:image:1',
      'urn:li:image:2',
    ]);
  });

  it('fails an expired account without calling LinkedIn', async () => {
    const expired = { ...account, expires_at: new Date(Date.now() - 1000) };

    const { failed } = await publisher.publishToAccounts({ text: 'hi' }, [expired]);

    expect(failed[0].error.message).toMatch(/expired.*Reconnect/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uploads a video in the assigned parts, finalizes it, and posts it once available', async () => {
    const statuses = ['PROCESSING', 'AVAILABLE'];
    jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => { fn(); return 0; }) as never);
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.startsWith('https://res.cloudinary.com')) return new Response('0123456789');
      if (url.includes('videos?action=initializeUpload')) {
        return json({
          value: {
            video: 'urn:li:video:9',
            uploadToken: 'tok',
            uploadInstructions: [
              { uploadUrl: 'https://upload/a', firstByte: 0, lastByte: 5 },
              { uploadUrl: 'https://upload/b', firstByte: 6, lastByte: 9 },
            ],
          },
        });
      }
      if (url.startsWith('https://upload/')) {
        return new Response(null, { status: 200, headers: { etag: `etag-${url.slice(-1)}` } });
      }
      if (url.includes('videos?action=finalizeUpload')) return new Response(null, { status: 200 });
      if (url.includes('/videos/') && !init?.method) return json({ status: statuses.shift() });
      return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:3' } });
    });
    const video = { ...image(1), resourceType: 'video' as const };

    const { successful, failed } = await publisher.publishToAccounts({ text: 'clip', cloudinaryMedia: [video] }, [account]);

    expect(failed).toEqual([]);
    expect(successful[0].post_id).toBe('urn:li:share:3');
    const parts = fetchMock.mock.calls.filter(([u]) => String(u).startsWith('https://upload/'));
    expect(parts.map(([, i]) => Buffer.from(i.body).toString())).toEqual(['012345', '6789']);
    const finalize = fetchMock.mock.calls.find(([u]) => String(u).includes('finalizeUpload'));
    expect(JSON.parse(finalize[1].body).finalizeUploadRequest).toEqual({
      video: 'urn:li:video:9',
      uploadToken: 'tok',
      uploadedPartIds: ['etag-a', 'etag-b'],
    });
    expect(postBody().content).toEqual({ media: { id: 'urn:li:video:9' } });
  });

  it('fails when LinkedIn cannot process the video', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.startsWith('https://res.cloudinary.com')) return new Response('0123');
      if (url.includes('initializeUpload')) {
        return json({ value: { video: 'urn:li:video:9', uploadToken: '', uploadInstructions: [{ uploadUrl: 'https://upload/a', firstByte: 0, lastByte: 3 }] } });
      }
      if (url.includes('/videos/') && !init?.method) return json({ status: 'PROCESSING_FAILED' });
      return new Response(null, { status: 200 });
    });
    const video = { ...image(1), resourceType: 'video' as const };

    const { failed } = await publisher.publishToAccounts({ text: 'clip', cloudinaryMedia: [video] }, [account]);

    expect(failed[0].error.message).toBe('LinkedIn could not process the video.');
  });

  it('fails a video combined with other media', async () => {
    const video = { ...image(1), resourceType: 'video' as const };

    const { failed } = await publisher.publishToAccounts({ text: 'hi', cloudinaryMedia: [video, image(2)] }, [account]);

    expect(failed[0].error.message).toBe('LinkedIn posts can contain one video, without other media.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks to reconnect when LinkedIn rejects the token', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'Invalid access token' }, { status: 401 }));

    const { failed } = await publisher.publishToAccounts({ text: 'hi' }, [account]);

    expect(failed[0].error.message).toBe('LinkedIn rejected the access token. Reconnect the account on the dashboard.');
  });

  it('reports the status and message of other API errors', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'Content is a duplicate' }, { status: 422 }));

    const { failed } = await publisher.publishToAccounts({ text: 'hi' }, [account]);

    expect(failed[0].error.message).toBe('LinkedIn could not create post (HTTP 422): Content is a duplicate');
  });
});

describe('escapeCommentary', () => {
  it('escapes every reserved little-text character', () => {
    expect(escapeCommentary('a\\b|{}@[]()<>#*_~ plain.')).toBe('a\\\\b\\|\\{\\}\\@\\[\\]\\(\\)\\<\\>\\#\\*\\_\\~ plain.');
  });
});
