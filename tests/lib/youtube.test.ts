import { youtubeTitleError } from '@/lib/youtube';

describe('youtubeTitleError', () => {
  it('accepts a blank title and one of up to 100 characters', () => {
    expect(youtubeTitleError('')).toBeNull();
    expect(youtubeTitleError('é'.repeat(100))).toBeNull();
  });

  it('rejects a title over 100 characters or with angle brackets', () => {
    expect(youtubeTitleError('a'.repeat(101))).toBe('YouTube titles can be at most 100 characters.');
    expect(youtubeTitleError('a <b>')).toBe('YouTube titles cannot contain < or >.');
  });
});
