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
