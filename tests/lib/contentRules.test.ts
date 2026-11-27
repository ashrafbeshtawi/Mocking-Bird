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
  canPickMedia,
  isValidMediaPick,
  pickMedia,
  defaultMediaPick,
  planContent,
  limitError,
  parseMediaSelection,
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
    expect(overLimit('facebook', { image: 30 })).toEqual([]);
  });

  it('applies a total item limit across kinds (Telegram media groups)', () => {
    expect(overLimit('telegram', { image: 6, video: 4 })).toEqual([]);
    expect(overLimit('telegram', { image: 8, video: 3 })).toEqual(['image', 'video']);
    expect(fitContent('telegram', ['text', 'image', 'video'], { image: 8, video: 3 })).toEqual({
      status: 'partial',
      options: [['text']],
    });
    expect(describeLimits('telegram', { image: 11 })).toBe('10 media items');
  });

  it('limits Instagram to a 10-image carousel or one video', () => {
    expect(fitContent('instagram', ['text', 'image'], { image: 11 })).toEqual({ status: 'unsupported' });
    expect(fitContent('instagram', ['text', 'image'], { image: 10 })).toEqual({ status: 'ok' });
    expect(fitContent('instagram', ['video'], { video: 2 })).toEqual({ status: 'unsupported' });
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

  it('describes every limit of the platform without counts', () => {
    expect(describeLimits('twitter')).toBe('4 images and 1 video');
    expect(describeLimits('telegram')).toBe('10 media items');
    expect(describeLimits('facebook')).toBe('');
  });
});

describe('media picks', () => {
  const img = (id: string) => ({ publicId: id, resourceType: 'image' as const });
  const vid = (id: string) => ({ publicId: id, resourceType: 'video' as const });
  const twoVideos = [vid('v1'), vid('v2')];
  const images = (n: number) => Array.from({ length: n }, (_, i) => img(`i${i + 1}`));

  it('offers a pick only when the post is over a limit', () => {
    expect(canPickMedia('youtube', twoVideos)).toBe(true);
    expect(canPickMedia('youtube', [vid('v1')])).toBe(false);
    expect(canPickMedia('facebook', twoVideos)).toBe(false);
  });

  it('accepts a pick of known items within the limits', () => {
    expect(isValidMediaPick('youtube', twoVideos, ['v2'])).toBe(true);
    expect(isValidMediaPick('youtube', twoVideos, ['v1', 'v2'])).toBe(false);
    expect(isValidMediaPick('youtube', twoVideos, ['v3'])).toBe(false);
    expect(isValidMediaPick('youtube', twoVideos, [])).toBe(false);
    expect(isValidMediaPick('youtube', twoVideos)).toBe(false);
  });

  it('sends the picked items, or everything when no valid pick applies', () => {
    expect(pickMedia('youtube', twoVideos, ['v2'])).toEqual([vid('v2')]);
    expect(pickMedia('youtube', twoVideos, ['v1', 'v2'])).toEqual(twoVideos);
    // Within the limits a stale pick does not trim the post.
    expect(pickMedia('facebook', twoVideos, ['v2'])).toEqual(twoVideos);
  });

  it('starts the chooser from the first items that fit', () => {
    expect(defaultMediaPick('youtube', twoVideos)).toEqual(['v1']);
    expect(defaultMediaPick('twitter', [vid('v1'), ...images(5)])).toEqual(['v1', 'i1', 'i2', 'i3', 'i4']);
    expect(defaultMediaPick('telegram', images(12))).toHaveLength(10);
  });

  describe('planContent', () => {
    it('asks YouTube with two videos to choose, then sends only the chosen one', () => {
      const before = planContent('youtube', true, twoVideos);
      expect(before.fit).toEqual({ status: 'unsupported' });
      expect(before.needsChoice).toBe(true);
      expect(before.sent).toBeNull();

      const after = planContent('youtube', true, twoVideos, { media: ['v2'] });
      expect(after).toMatchObject({ media: [vid('v2')], fit: { status: 'ok' }, mediaPicked: true, needsChoice: false });
      expect(after.sent).toEqual(['text', 'video']);
    });

    it('behaves as before when the post is within every limit', () => {
      const plan = planContent('twitter', true, [img('i1'), img('i2')], { media: ['i1'] });
      expect(plan).toMatchObject({ canPickMedia: false, mediaPicked: false, needsChoice: false, fit: { status: 'ok' } });
      expect(plan.media).toHaveLength(2);
    });

    it('lets the user drop the over-limit kind instead of picking items', () => {
      expect(planContent('twitter', true, images(5)).needsChoice).toBe(true);
      const textOnly = planContent('twitter', true, images(5), { kinds: ['text'] });
      expect(textOnly.sent).toEqual(['text']);
      expect(textOnly.needsChoice).toBe(false);
    });

    it('recomputes the kinds from the picked items', () => {
      const plan = planContent('telegram', false, [...images(9), vid('v1'), vid('v2')], {
        media: images(9).map((m) => m.publicId).concat('v1'),
      });
      expect(plan.kinds).toEqual(['image', 'video']);
      expect(plan.counts).toEqual({ image: 9, video: 1 });
      expect(plan.fit).toEqual({ status: 'ok' });
    });
  });

  describe('limitError', () => {
    it('reports what goes over a limit after the selections', () => {
      expect(limitError('youtube', twoVideos)).toBe('1 video');
      expect(limitError('youtube', twoVideos, undefined, ['v1'])).toBeNull();
      expect(limitError('twitter', images(5), ['text'])).toBeNull();
      expect(limitError('telegram', images(11))).toBe('10 media items');
      expect(limitError('facebook', images(30))).toBeNull();
    });
  });

  describe('parseMediaSelection', () => {
    it('keeps known platforms and IDs of the post, and drops empty picks', () => {
      expect(
        parseMediaSelection({ youtube: ['v2', 'nope', 7, 'v2'], mastodon: ['v1'], tiktok: ['nope'], twitter: 'v1' }, twoVideos)
      ).toEqual({ youtube: ['v2'] });
      expect(parseMediaSelection(undefined, twoVideos)).toEqual({});
    });
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
