jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

import { MAX_DRAFT_MEDIA, validateDraftInput } from '@/lib/drafts';

const mediaOf = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ publicUrl: `https://example.com/${i}.jpg` }));

describe('validateDraftInput media limit', () => {
  it(`accepts ${MAX_DRAFT_MEDIA} media items`, () => {
    expect(validateDraftInput({ text: 'hi', media: mediaOf(MAX_DRAFT_MEDIA) })).toBeNull();
  });

  it(`rejects more than ${MAX_DRAFT_MEDIA} media items`, () => {
    expect(validateDraftInput({ text: 'hi', media: mediaOf(MAX_DRAFT_MEDIA + 1) })).toBe(
      `A draft can hold at most ${MAX_DRAFT_MEDIA} media items.`
    );
  });

  it('still accepts a draft without media', () => {
    expect(validateDraftInput({ text: 'hi', media: null })).toBeNull();
  });
});

describe('validateDraftInput Instagram placements', () => {
  const withTarget = (target: Record<string, unknown>) => validateDraftInput({ text: 'hi', target_accounts: [target] });

  it.each([[['feed']], [['story']], [['feed', 'story']]])('accepts placements %j on Instagram', (placements) => {
    expect(withTarget({ platform: 'instagram', account_id: 'ig1', placements })).toBeNull();
  });

  it('accepts an Instagram target without placements', () => {
    expect(withTarget({ platform: 'instagram', account_id: 'ig1' })).toBeNull();
  });

  it('rejects placements on other platforms', () => {
    expect(withTarget({ platform: 'facebook', account_id: 'p1', placements: ['feed'] })).toBe(
      'placements can only be set on instagram targets.'
    );
  });

  it.each([[[]], [['reel']], [['feed', 'feed']], ['story']])('rejects placements %j', (placements) => {
    expect(withTarget({ platform: 'instagram', account_id: 'ig1', placements })).toBe(
      'placements must be a non-empty list of: feed, story.'
    );
  });
});
