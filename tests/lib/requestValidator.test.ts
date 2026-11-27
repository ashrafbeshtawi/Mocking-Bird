import { hasAnyDestination, parsePublishRequest } from '@/lib/publish/validators/requestValidator';
import type { PublishRequest } from '@/lib/publish/types';

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

describe('parsePublishRequest media limits', () => {
  const video = (id: string) => ({ publicId: id, publicUrl: `https://res.cloudinary.com/${id}`, resourceType: 'video' });
  const twoVideos = [video('v1'), video('v2')];

  it('rejects more videos than YouTube takes when no item is picked', async () => {
    const result = await parsePublishRequest({ text: 'hi', youtubeChannels: ['yt1'], cloudinaryMedia: twoVideos });

    expect(result.success).toBe(false);
    expect(result.error).toBe('YouTube takes at most 1 video per post. Choose which media to send.');
  });

  it('accepts a pick within the limit and keeps it', async () => {
    const result = await parsePublishRequest({
      text: 'hi',
      youtubeChannels: ['yt1'],
      cloudinaryMedia: twoVideos,
      mediaSelection: { youtube: ['v2'] },
    });

    expect(result.success).toBe(true);
    expect(result.data?.mediaSelection).toEqual({ youtube: ['v2'] });
  });

  it('rejects a pick that is still over the limit', async () => {
    const result = await parsePublishRequest({
      text: 'hi',
      youtubeChannels: ['yt1'],
      cloudinaryMedia: twoVideos,
      mediaSelection: { youtube: ['v1', 'v2'] },
    });

    expect(result.success).toBe(false);
  });

  it('accepts a kind selection that leaves the over-limit kind out', async () => {
    const images = Array.from({ length: 5 }, (_, i) => ({ ...video(`i${i}`), resourceType: 'image' }));
    const result = await parsePublishRequest({
      text: 'hi',
      xAccounts: ['x1'],
      cloudinaryMedia: images,
      contentSelection: { twitter: ['text'] },
    });

    expect(result.success).toBe(true);
  });

  it('ignores platforms the request does not post to', async () => {
    const result = await parsePublishRequest({ text: 'hi', facebookPages: ['p1'], cloudinaryMedia: twoVideos });

    expect(result.success).toBe(true);
  });
});

describe('parsePublishRequest media thumbnails', () => {
  const thumbnail = { publicId: 'thumb1', publicUrl: 'https://res.cloudinary.com/thumb1.jpg' };
  const item = (resourceType: 'image' | 'video', extra: object) => ({
    publicId: 'm1',
    publicUrl: 'https://res.cloudinary.com/m1',
    resourceType,
    ...extra,
  });

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
