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
