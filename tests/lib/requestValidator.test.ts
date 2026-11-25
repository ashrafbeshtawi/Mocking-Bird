import { hasAnyDestination, parsePublishRequest } from '@/lib/publish/validators/requestValidator';
import type { PublishRequest } from '@/lib/publish/types';
import { fetchMedia, isAllowedMediaUrl, MEDIA_MAX_BYTES, MediaFetchError } from '@/lib/publish/mediaUrl';

const parsed = async (body: object) => (await parsePublishRequest({ text: 'hi', ...body })).data as PublishRequest;

describe('hasAnyDestination', () => {
  it('is false when no account is selected on any platform', async () => {
    expect(hasAnyDestination(await parsed({}))).toBe(false);
  });

  it.each([
    ['facebookPages', ['p1']],
    ['instagramStoryAccounts', ['ig1']],
    ['tiktokAccounts', ['oid-1']],
  ])('is true when %s has an account', async (field, ids) => {
    const extra = field === 'tiktokAccounts' ? { tiktokSettings: { privacyLevel: 'SELF_ONLY' } } : {};
    expect(hasAnyDestination(await parsed({ [field]: ids, ...extra }))).toBe(true);
  });
});

const CLOUD = 'https://res.cloudinary.com/demo';
const thumbnail = { publicId: 'thumb1', publicUrl: `${CLOUD}/image/upload/v1/thumb1.jpg` };
const item = (resourceType: 'image' | 'video', extra: object = {}) => ({
  publicId: 'mocking-bird/m1',
  publicUrl: `${CLOUD}/${resourceType}/upload/v17/mocking-bird/m1.${resourceType === 'video' ? 'mp4' : 'jpg'}`,
  resourceType,
  ...extra,
});

const originalCloudinaryUrl = process.env.CLOUDINARY_URL;
beforeEach(() => {
  process.env.CLOUDINARY_URL = 'cloudinary://123456:secret@demo';
});
afterAll(() => {
  process.env.CLOUDINARY_URL = originalCloudinaryUrl;
});

describe('isAllowedMediaUrl', () => {
  it.each([
    ['a Cloudinary upload of our cloud', `${CLOUD}/image/upload/v1/mocking-bird/m1.jpg`, 'mocking-bird/m1'],
    ['a video without a version segment', `${CLOUD}/video/upload/mocking-bird/m1.mp4`, 'mocking-bird/m1'],
    ['a URL with transformations', `${CLOUD}/image/upload/c_limit,w_1280/v1/mocking-bird/m1.jpg`, 'mocking-bird/m1'],
    ['a URL without a file extension', `${CLOUD}/image/upload/v1/mocking-bird/m1`, 'mocking-bird/m1'],
  ])('accepts %s', (_case, url, publicId) => {
    expect(isAllowedMediaUrl(url, publicId)).toBe(true);
  });

  it.each([
    ['an internal host', 'http://dbgate:3000/', 'm1'],
    ['the metadata service', 'http://169.254.169.254/latest/meta-data/m1', 'm1'],
    ['plain http on Cloudinary', 'http://res.cloudinary.com/demo/image/upload/v1/m1.jpg', 'm1'],
    ['another Cloudinary cloud', 'https://res.cloudinary.com/evil/image/upload/v1/m1.jpg', 'm1'],
    ['a look-alike host', 'https://res.cloudinary.com.evil.test/demo/image/upload/v1/m1.jpg', 'm1'],
    ['credentials in the URL', 'https://user:pw@res.cloudinary.com/demo/image/upload/v1/m1.jpg', 'm1'],
    ['an explicit port', 'https://res.cloudinary.com:8443/demo/image/upload/v1/m1.jpg', 'm1'],
    ['a fetch-type (remote) URL', `${CLOUD}/image/fetch/http://internal/m1.jpg`, 'm1'],
    ['a path for another asset', `${CLOUD}/image/upload/v1/other.jpg`, 'm1'],
    ['an asset that only ends like the publicId', `${CLOUD}/image/upload/v1/xm1.jpg`, 'm1'],
    ['a path escaping the cloud folder', `${CLOUD}/../evil/image/upload/v1/m1.jpg`, 'm1'],
    ['an empty publicId', `${CLOUD}/image/upload/v1/m1.jpg`, ''],
    ['something that is not a URL', 'not a url', 'm1'],
  ])('rejects %s', (_case, url, publicId) => {
    expect(isAllowedMediaUrl(url, publicId)).toBe(false);
  });

  it('rejects everything when Cloudinary is not configured', () => {
    delete process.env.CLOUDINARY_URL;
    expect(isAllowedMediaUrl(`${CLOUD}/image/upload/v1/m1.jpg`, 'm1')).toBe(false);
  });
});

describe('parsePublishRequest media URLs', () => {
  it('keeps media hosted on our Cloudinary cloud', async () => {
    const result = await parsePublishRequest({ text: 'hi', cloudinaryMedia: [item('image'), item('video')] });

    expect(result.success).toBe(true);
    expect(result.data?.cloudinaryMedia.map((m) => m.publicUrl)).toEqual([item('image').publicUrl, item('video').publicUrl]);
  });

  it.each([
    ['an internal host', 'http://dbgate:3000/'],
    ['the metadata service', 'http://169.254.169.254/latest/meta-data/'],
    ['another Cloudinary cloud', 'https://res.cloudinary.com/evil/image/upload/v1/mocking-bird/m1.jpg'],
    ['an asset other than its publicId', `${CLOUD}/image/upload/v1/mocking-bird/other.jpg`],
  ])('rejects the request when a media URL points to %s', async (_case, publicUrl) => {
    const result = await parsePublishRequest({
      text: 'hi',
      cloudinaryMedia: [item('image'), item('image', { publicUrl, originalFilename: 'evil.jpg' })],
    });

    expect(result).toEqual({ success: false, error: 'Media "evil.jpg" must be uploaded to this app\'s Cloudinary account.' });
  });

  it('drops a video thumbnail hosted elsewhere', async () => {
    const { cloudinaryMedia } = await parsed({
      cloudinaryMedia: [item('video', { thumbnail: { publicId: 'thumb1', publicUrl: 'http://ollama:11434/api/tags' } })],
    });

    expect(cloudinaryMedia).toHaveLength(1);
    expect(cloudinaryMedia[0]).not.toHaveProperty('thumbnail');
  });
});

describe('fetchMedia', () => {
  const url = `${CLOUD}/image/upload/v1/mocking-bird/m1.jpg`;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchSpy.mockRestore());

  it('downloads an allowed URL with a timeout', async () => {
    fetchSpy.mockResolvedValue(new Response('jpeg', { headers: { 'content-type': 'image/jpeg' } }));

    const { bytes, contentType } = await fetchMedia(url, 'image', { publicId: 'mocking-bird/m1' });

    expect(Buffer.from(bytes).toString()).toBe('jpeg');
    expect(contentType).toBe('image/jpeg');
    expect(fetchSpy).toHaveBeenCalledWith(url, { signal: expect.any(AbortSignal) });
  });

  it('never requests a URL outside our Cloudinary cloud', async () => {
    await expect(fetchMedia('http://169.254.169.254/latest/meta-data', 'image')).rejects.toThrow(MediaFetchError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses a file whose declared size exceeds the cap', async () => {
    fetchSpy.mockResolvedValue(
      new Response('x', { headers: { 'content-length': String(MEDIA_MAX_BYTES.image + 1) } })
    );

    await expect(fetchMedia(url, 'image', { label: 'thumbnail' })).rejects.toThrow('The thumbnail is larger than the 25 MB limit.');
  });

  it('stops reading a file that grows past the cap without declaring its size', async () => {
    const chunk = new Uint8Array(MEDIA_MAX_BYTES.image / 4);
    let sent = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent++;
        controller.enqueue(chunk);
      },
    });
    fetchSpy.mockResolvedValue(new Response(endless));

    await expect(fetchMedia(url, 'image')).rejects.toThrow('larger than the 25 MB limit');
    expect(sent).toBeLessThanOrEqual(6);
  });

  it('reports the HTTP status of a failed download', async () => {
    fetchSpy.mockResolvedValue(new Response('gone', { status: 404 }));

    await expect(fetchMedia(url, 'image', { label: 'thumbnail' })).rejects.toMatchObject({
      message: 'Could not download the thumbnail (HTTP 404)',
      details: { status: 404 },
    });
  });
});

describe('parsePublishRequest media thumbnails', () => {

  it('keeps the thumbnail of a video', async () => {
    const { cloudinaryMedia } = await parsed({ cloudinaryMedia: [item('video', { thumbnail })] });

    expect(cloudinaryMedia[0].thumbnail).toEqual(thumbnail);
  });

  it.each([
    ['an image', item('image', { thumbnail })],
    ['a video with a malformed thumbnail', item('video', { thumbnail: { publicUrl: 42 } })],
  ])('drops the thumbnail of %s', async (_case, media) => {
    const { cloudinaryMedia } = await parsed({ cloudinaryMedia: [media] });

    expect(cloudinaryMedia).toHaveLength(1);
    expect(cloudinaryMedia[0]).not.toHaveProperty('thumbnail');
  });
});
