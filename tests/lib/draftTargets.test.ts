import { describeMissingTargets, findMissingTargets } from '@/lib/draftTargets';
import { getInstagramSelectionOf, getPlacementsOf, type Platform } from '@/types/accounts';

const connected: Record<Platform, string[]> = {
  facebook: ['p1'],
  instagram: ['ig1'],
  twitter: [],
  telegram: [],
  linkedin: [],
  youtube: [],
  tiktok: ['t1'],
};

describe('findMissingTargets', () => {
  it('returns the targets whose account is no longer connected', () => {
    expect(
      findMissingTargets(
        [
          { platform: 'facebook', account_id: 'p1' },
          { platform: 'facebook', account_id: 'gone' },
          { platform: 'twitter', account_id: 'x1' },
          { platform: 'instagram', account_id: 'ig1', placements: ['story'] },
        ],
        (platform) => connected[platform]
      )
    ).toEqual([
      { platform: 'facebook', account_id: 'gone' },
      { platform: 'twitter', account_id: 'x1' },
    ]);
  });

  it('returns nothing when every target is connected', () => {
    expect(findMissingTargets([{ platform: 'tiktok', account_id: 't1' }], (platform) => connected[platform])).toEqual([]);
  });
});

describe('describeMissingTargets', () => {
  it('names one missing account', () => {
    expect(describeMissingTargets([{ platform: 'facebook', account_id: 'gone' }])).toBe(
      '1 account is no longer connected and will be skipped: Facebook gone. Reconnect it to publish there.'
    );
  });

  it('names several missing accounts', () => {
    expect(
      describeMissingTargets([
        { platform: 'twitter', account_id: 'x1' },
        { platform: 'tiktok', account_id: 't9' },
      ])
    ).toBe('2 accounts are no longer connected and will be skipped: X x1, TikTok t9. Reconnect them to publish there.');
  });
});

describe('Instagram placements', () => {
  it('reads a target without placements as the feed', () => {
    expect(getInstagramSelectionOf({ platform: 'instagram', account_id: 'ig1' })).toEqual({ publish: true, story: false });
  });

  it('reads feed and story placements', () => {
    expect(
      getInstagramSelectionOf({ platform: 'instagram', account_id: 'ig1', placements: ['feed', 'story'] })
    ).toEqual({ publish: true, story: true });
    expect(getInstagramSelectionOf({ platform: 'instagram', account_id: 'ig1', placements: ['story'] })).toEqual({
      publish: false,
      story: true,
    });
  });

  it('stores the feed alone as no placements and anything else explicitly', () => {
    expect(getPlacementsOf({ publish: true, story: false })).toBeUndefined();
    expect(getPlacementsOf({ publish: false, story: true })).toEqual(['story']);
    expect(getPlacementsOf({ publish: true, story: true })).toEqual(['feed', 'story']);
  });
});
