import {
  contentKinds,
  fitContent,
  resolveContent,
  needsChoice,
  describeKinds,
  describeLimits,
  mediaCounts,
  overLimit,
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
    expect(fitContent('linkedin', ['text', 'image', 'video'])).toEqual({
      status: 'partial',
      options: [
        ['text', 'image'],
        ['text', 'video'],
      ],
    });
  });

  it('rejects text-only on Instagram and accepts media with a caption', () => {
    expect(fitContent('instagram', ['text'])).toEqual({ status: 'unsupported' });
    expect(fitContent('instagram', ['text', 'image'])).toEqual({ status: 'ok' });
    expect(fitContent('instagram', ['video'])).toEqual({ status: 'ok' });
  });

  it('takes only a video on YouTube, with text as its title and description', () => {
    expect(fitContent('youtube', ['video'])).toEqual({ status: 'ok' });
    expect(fitContent('youtube', ['text', 'video'])).toEqual({ status: 'ok' });
    expect(fitContent('youtube', ['text'])).toEqual({ status: 'unsupported' });
    expect(fitContent('youtube', ['text', 'image'])).toEqual({ status: 'unsupported' });
    expect(fitContent('youtube', ['text', 'image', 'video'])).toEqual({ status: 'partial', options: [['text', 'video']] });
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

describe('media count limits', () => {
  it('counts images and videos', () => {
    expect(mediaCounts([image, video, image])).toEqual({ image: 2, video: 1 });
    expect(mediaCounts([])).toEqual({});
  });

  it('rejects a second video on YouTube and TikTok', () => {
    const twoVideos = mediaCounts([video, video]);
    expect(fitContent('youtube', ['text', 'video'], twoVideos)).toEqual({ status: 'unsupported' });
    expect(fitContent('tiktok', ['video'], twoVideos)).toEqual({ status: 'unsupported' });
    expect(fitContent('youtube', ['text', 'video'], mediaCounts([video]))).toEqual({ status: 'ok' });
  });

  it('drops a kind over its limit from the options', () => {
    expect(fitContent('twitter', ['text', 'image'], { image: 5 })).toEqual({ status: 'partial', options: [['text']] });
    expect(fitContent('twitter', ['text', 'image'], { image: 4 })).toEqual({ status: 'ok' });
    expect(fitContent('linkedin', ['text', 'image', 'video'], { image: 21, video: 1 })).toEqual({
      status: 'partial',
      options: [['text', 'video']],
    });
  });

  it('leaves platforms without limits alone', () => {
    expect(fitContent('facebook', ['text', 'image', 'video'], { image: 30, video: 5 })).toEqual({ status: 'ok' });
    expect(overLimit('telegram', { image: 30 })).toEqual([]);
  });

  it('applies the limits when resolving and when asking for a choice', () => {
    expect(resolveContent('twitter', ['text', 'image'], undefined, { image: 5 })).toBeNull();
    expect(resolveContent('twitter', ['text', 'image'], ['text'], { image: 5 })).toEqual(['text']);
    expect(needsChoice('twitter', ['text', 'image'], undefined, { image: 5 })).toBe(true);
    expect(needsChoice('youtube', ['text', 'video'], undefined, { video: 2 })).toBe(false);
  });

  it('describes what the platform takes at most', () => {
    expect(describeLimits('youtube', { video: 2 })).toBe('1 video');
    expect(describeLimits('twitter', { image: 5, video: 2 })).toBe('4 images and 1 video');
    expect(describeLimits('twitter', { image: 2 })).toBe('');
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
