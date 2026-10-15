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
