import {
  contentKinds,
  fitContent,
  resolveContent,
  needsChoice,
  describeKinds,
  parseContentSelection,
} from '@/lib/publish/contentRules';

const image = { resourceType: 'image' as const };
const video = { resourceType: 'video' as const };

describe('contentKinds', () => {
  it('lists the kinds present, in a fixed order', () => {
    expect(contentKinds('hi', [video, image])).toEqual(['text', 'image', 'video']);
    expect(contentKinds('   ', [image])).toEqual(['image']);
  });
});

describe('fitContent', () => {
  it('accepts any mix on Facebook and Telegram', () => {
    expect(fitContent('facebook', ['text', 'image', 'video'])).toEqual({ status: 'ok' });
    expect(fitContent('telegram', ['text'])).toEqual({ status: 'ok' });
  });

  it('offers the largest sendable subsets when X gets images and video', () => {
    expect(fitContent('twitter', ['text', 'image', 'video'])).toEqual({
      status: 'partial',
      options: [
        ['text', 'image'],
        ['text', 'video'],
      ],
    });
    expect(fitContent('twitter', ['image', 'video'])).toEqual({
      status: 'partial',
      options: [['image'], ['video']],
    });
  });

  it('rejects text-only on Instagram and accepts media with a caption', () => {
    expect(fitContent('instagram', ['text'])).toEqual({ status: 'unsupported' });
    expect(fitContent('instagram', ['text', 'image'])).toEqual({ status: 'ok' });
    expect(fitContent('instagram', ['video'])).toEqual({ status: 'ok' });
  });

  it('treats an empty post as unsupported everywhere', () => {
    expect(fitContent('facebook', [])).toEqual({ status: 'unsupported' });
  });
});

describe('resolveContent', () => {
  it('sends everything when the post fits', () => {
    expect(resolveContent('facebook', ['text', 'video'], ['text'])).toEqual(['text', 'video']);
  });

  it('sends the chosen option, and nothing while none is chosen', () => {
    const kinds = ['text', 'image', 'video'] as const;
    expect(resolveContent('twitter', [...kinds])).toBeNull();
    expect(resolveContent('twitter', [...kinds], ['video', 'text'])).toEqual(['text', 'video']);
  });

  it('ignores a choice that is not one of the offered options', () => {
    expect(resolveContent('twitter', ['text', 'image', 'video'], ['text'])).toBeNull();
    expect(resolveContent('instagram', ['text'], ['text'])).toBeNull();
  });
});

describe('needsChoice', () => {
  it('is true only for a partial fit without a valid choice', () => {
    const mixed = ['text', 'image', 'video'] as const;
    expect(needsChoice('twitter', [...mixed])).toBe(true);
    expect(needsChoice('twitter', [...mixed], ['text', 'video'])).toBe(false);
    expect(needsChoice('facebook', [...mixed])).toBe(false);
    expect(needsChoice('instagram', ['text'])).toBe(false);
  });
});

describe('describeKinds', () => {
  it('names kinds in order', () => {
    expect(describeKinds(['video', 'text'])).toBe('text + video');
  });
});

describe('parseContentSelection', () => {
  it('keeps only known platforms and kinds', () => {
    expect(parseContentSelection({ twitter: ['text', 'gif'], mastodon: ['text'], instagram: 'text' })).toEqual({
      twitter: ['text'],
    });
    expect(parseContentSelection(null)).toEqual({});
  });
});
