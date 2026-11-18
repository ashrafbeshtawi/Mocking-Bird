jest.mock('@/lib/db', () => ({ __esModule: true, default: { query: jest.fn() } }));

import { validateDraftInput } from '@/lib/drafts';
import { buildInstagramTarget, getInstagramSelection } from '@/types/accounts';

describe('Instagram draft targets', () => {
  it.each([
    [{ publish: true, story: false }, { platform: 'instagram', account_id: 'ig1' }],
    [{ publish: false, story: true }, { platform: 'instagram', account_id: 'ig1', post_types: ['story'] }],
    [{ publish: true, story: true }, { platform: 'instagram', account_id: 'ig1', post_types: ['feed', 'story'] }],
  ])('round-trips the selection %j through its target', (selection, target) => {
    expect(buildInstagramTarget('ig1', selection)).toEqual(target);
    expect(getInstagramSelection(buildInstagramTarget('ig1', selection)!)).toEqual(selection);
  });

  it('builds no target for an empty selection and selects nothing without a target', () => {
    expect(buildInstagramTarget('ig1', { publish: false, story: false })).toBeNull();
    expect(getInstagramSelection(undefined)).toEqual({ publish: false, story: false });
  });

  it.each([
    [[{ platform: 'instagram', account_id: 'ig1', post_types: ['story'] }], null],
    [[{ platform: 'facebook', account_id: 'p1', post_types: ['feed'] }], 'Instagram targets only'],
    [[{ platform: 'instagram', account_id: 'ig1', post_types: [] }], 'Instagram targets only'],
    [[{ platform: 'instagram', account_id: 'ig1', post_types: ['reel'] }], 'Instagram targets only'],
    [[{ platform: 'instagram', account_id: 'ig1', post_types: ['feed', 'feed'] }], 'Instagram targets only'],
  ])('validates post_types in %j', (targets, error) => {
    const result = validateDraftInput({ text: 'hi', target_accounts: targets });
    if (error === null) expect(result).toBeNull();
    else expect(result).toContain(error);
  });
});
