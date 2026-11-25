import type { Platform } from '@/types/accounts';

/** The kinds of content a post can carry. */
export type ContentKind = 'text' | 'image' | 'video';

/** The media kinds, the ones a post can carry more than one of. */
export type MediaKind = Exclude<ContentKind, 'text'>;

/** How many images and videos a post carries. */
export type MediaCounts = Partial<Record<MediaKind, number>>;

/** Per platform, the kinds the user picked to send when the full post does not fit. */
export type ContentSelection = Partial<Record<Platform, ContentKind[]>>;

export interface PlatformContentRules {
  /** Kinds the platform can post on their own. */
  supported: ContentKind[];
  /**
   * Kinds that may share one post. 'all' = any combination of `supported`.
   * A kind that appears only here (e.g. Instagram text) is allowed only inside such a mix.
   */
  mixes: ContentKind[][] | 'all';
  /** Most items of a media kind one post may carry; a kind above it cannot be sent. */
  max?: MediaCounts;
}

export const PLATFORM_CONTENT_RULES: Record<Platform, PlatformContentRules> = {
  facebook: { supported: ['text', 'image', 'video'], mixes: 'all' },
  telegram: { supported: ['text', 'image', 'video'], mixes: 'all' },
  twitter: { supported: ['text', 'image', 'video'], mixes: [['text', 'image'], ['text', 'video']], max: { image: 4, video: 1 } },
  instagram: { supported: ['image', 'video'], mixes: [['text', 'image'], ['text', 'video']] },
  linkedin: { supported: ['text', 'image', 'video'], mixes: [['text', 'image'], ['text', 'video']], max: { image: 20, video: 1 } },
  youtube: { supported: ['video'], mixes: [['text', 'video']], max: { video: 1 } },
  tiktok: { supported: ['video'], mixes: [['text', 'video']], max: { video: 1 } },
};

/** How a post fits a platform's rules. `partial` lists the largest sendable subsets. */
export type ContentFit =
  | { status: 'ok' }
  | { status: 'partial'; options: ContentKind[][] }
  | { status: 'unsupported' };

const KIND_ORDER: ContentKind[] = ['text', 'image', 'video'];

const sortKinds = (kinds: ContentKind[]): ContentKind[] =>
  KIND_ORDER.filter((k) => kinds.includes(k));

export const sameKinds = (a: ContentKind[], b: ContentKind[]): boolean =>
  a.length === b.length && a.every((k) => b.includes(k));

const isSubset = (a: ContentKind[], b: ContentKind[]): boolean => a.every((k) => b.includes(k));

/** The kinds present in a post. */
export function contentKinds(
  text: string,
  media: ReadonlyArray<{ resourceType: 'image' | 'video' }>
): ContentKind[] {
  const kinds = new Set<ContentKind>();
  if (text.trim() !== '') kinds.add('text');
  media.forEach((m) => kinds.add(m.resourceType));
  return sortKinds([...kinds]);
}

/** How many images and videos a post carries. */
export function mediaCounts(media: ReadonlyArray<{ resourceType: MediaKind }>): MediaCounts {
  const counts: MediaCounts = {};
  media.forEach((m) => (counts[m.resourceType] = (counts[m.resourceType] ?? 0) + 1));
  return counts;
}

/** The media kinds the post carries more of than the platform takes in one post, e.g. ['video']. */
export function overLimit(platform: Platform, counts: MediaCounts = {}): MediaKind[] {
  const max = PLATFORM_CONTENT_RULES[platform].max ?? {};
  return (['image', 'video'] as const).filter((k) => max[k] !== undefined && (counts[k] ?? 0) > max[k]);
}

export function isAllowed(platform: Platform, kinds: ContentKind[], counts?: MediaCounts): boolean {
  const { supported, mixes } = PLATFORM_CONTENT_RULES[platform];
  if (kinds.length === 0) return false;
  const tooMany = overLimit(platform, counts);
  if (kinds.some((k) => (tooMany as ContentKind[]).includes(k))) return false;
  if (kinds.length === 1) return supported.includes(kinds[0]);
  if (mixes === 'all') return isSubset(kinds, supported);
  return mixes.some((mix) => sameKinds(mix, kinds));
}

/** Every non-empty proper subset of `kinds`. */
const properSubsets = (kinds: ContentKind[]): ContentKind[][] => {
  const out: ContentKind[][] = [];
  for (let mask = 1; mask < (1 << kinds.length) - 1; mask++) {
    out.push(kinds.filter((_, i) => mask & (1 << i)));
  }
  return out;
};

/** `counts` (see `mediaCounts`) applies the platform's per-kind limits; without it only kinds count. */
export function fitContent(platform: Platform, kinds: ContentKind[], counts?: MediaCounts): ContentFit {
  if (isAllowed(platform, kinds, counts)) return { status: 'ok' };
  const allowed = properSubsets(kinds).filter((s) => isAllowed(platform, s, counts));
  // Keep only the largest subsets: a smaller one is never a better choice.
  const options = allowed.filter((s) => !allowed.some((o) => o.length > s.length && isSubset(s, o)));
  return options.length > 0 ? { status: 'partial', options } : { status: 'unsupported' };
}

/**
 * The kinds that go to `platform`: everything when the post fits, the user's pick
 * when it is one of the offered options, nothing otherwise.
 */
export function resolveContent(
  platform: Platform,
  kinds: ContentKind[],
  selection?: ContentKind[],
  counts?: MediaCounts
): ContentKind[] | null {
  const fit = fitContent(platform, kinds, counts);
  if (fit.status === 'ok') return kinds;
  if (fit.status === 'partial' && selection && fit.options.some((o) => sameKinds(o, selection))) {
    return sortKinds(selection);
  }
  return null;
}

/** Whether the platform can take part of the post but the user has not yet chosen which part. */
export function needsChoice(
  platform: Platform,
  kinds: ContentKind[],
  selection?: ContentKind[],
  counts?: MediaCounts
): boolean {
  return (
    fitContent(platform, kinds, counts).status === 'partial' &&
    resolveContent(platform, kinds, selection, counts) === null
  );
}

const KIND_LABELS: Record<ContentKind, string> = { text: 'text', image: 'images', video: 'video' };

/** "text + images", "video" */
export function describeKinds(kinds: ContentKind[]): string {
  return sortKinds(kinds).map((k) => KIND_LABELS[k]).join(' + ');
}

const LIMIT_LABELS: Record<MediaKind, [string, string]> = { image: ['image', 'images'], video: ['video', 'videos'] };

/** "1 video", "4 images and 1 video": what the platform takes at most of each kind the post has too many of. */
export function describeLimits(platform: Platform, counts?: MediaCounts): string {
  const max = PLATFORM_CONTENT_RULES[platform].max ?? {};
  return overLimit(platform, counts)
    .map((k) => `${max[k]} ${LIMIT_LABELS[k][max[k] === 1 ? 0 : 1]}`)
    .join(' and ');
}

/** Parses an untrusted selection into one keyed by known platforms with known kinds. */
export function parseContentSelection(value: unknown): ContentSelection {
  const selection: ContentSelection = {};
  if (typeof value !== 'object' || value === null) return selection;
  for (const [platform, kinds] of Object.entries(value)) {
    if (!(platform in PLATFORM_CONTENT_RULES) || !Array.isArray(kinds)) continue;
    selection[platform as Platform] = kinds.filter(
      (k): k is ContentKind => typeof k === 'string' && (KIND_ORDER as string[]).includes(k)
    );
  }
  return selection;
}
