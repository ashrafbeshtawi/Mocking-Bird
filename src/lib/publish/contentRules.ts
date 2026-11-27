import type { Platform } from '@/types/accounts';

/** The kinds of content a post can carry. */
export type ContentKind = 'text' | 'image' | 'video';

/** The media kinds, the ones a post can carry more than one of. */
export type MediaKind = Exclude<ContentKind, 'text'>;

/** How many images and videos a post carries. */
export type MediaCounts = Partial<Record<MediaKind, number>>;

/** Per platform, the kinds the user picked to send when the full post does not fit. */
export type ContentSelection = Partial<Record<Platform, ContentKind[]>>;

/**
 * Per platform, the media items (Cloudinary public IDs) the user picked to send when
 * the post has more media than the platform takes, e.g. which of two videos goes to YouTube.
 */
export type MediaSelection = Partial<Record<Platform, string[]>>;

/** A media item of a post, as far as the rules care. */
export interface PostMedia {
  publicId: string;
  resourceType: MediaKind;
}

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
  /** Most media items of any kind one post may carry (e.g. a Telegram media group). */
  maxItems?: number;
}

export const PLATFORM_CONTENT_RULES: Record<Platform, PlatformContentRules> = {
  facebook: { supported: ['text', 'image', 'video'], mixes: 'all' },
  telegram: { supported: ['text', 'image', 'video'], mixes: 'all', maxItems: 10 },
  twitter: { supported: ['text', 'image', 'video'], mixes: [['text', 'image'], ['text', 'video']], max: { image: 4, video: 1 } },
  instagram: { supported: ['image', 'video'], mixes: [['text', 'image'], ['text', 'video']], max: { image: 10, video: 1 } },
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

const MEDIA_KINDS: MediaKind[] = ['image', 'video'];

const totalItems = (counts: MediaCounts = {}): number => (counts.image ?? 0) + (counts.video ?? 0);

/** The kinds above their own limit, e.g. ['video'] for two videos on YouTube. */
const kindsOverMax = (platform: Platform, counts: MediaCounts = {}): MediaKind[] => {
  const max = PLATFORM_CONTENT_RULES[platform].max ?? {};
  return MEDIA_KINDS.filter((k) => max[k] !== undefined && (counts[k] ?? 0) > max[k]);
};

/** Whether the post has more media items in total than the platform takes in one post. */
const isOverMaxItems = (platform: Platform, counts: MediaCounts = {}): boolean => {
  const { maxItems } = PLATFORM_CONTENT_RULES[platform];
  return maxItems !== undefined && totalItems(counts) > maxItems;
};

/**
 * The media kinds the post carries more of than the platform takes in one post, e.g. ['video'].
 * Over the total item limit, every media kind the post has counts as over.
 */
export function overLimit(platform: Platform, counts: MediaCounts = {}): MediaKind[] {
  if (isOverMaxItems(platform, counts)) return MEDIA_KINDS.filter((k) => (counts[k] ?? 0) > 0);
  return kindsOverMax(platform, counts);
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

const countLabel = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

/**
 * "1 video", "4 images and 1 video", "10 media items": what the platform takes at most
 * of what the post has too many of. Without `counts`, every limit the platform has.
 */
export function describeLimits(platform: Platform, counts?: MediaCounts): string {
  const { max = {}, maxItems } = PLATFORM_CONTENT_RULES[platform];
  const kinds = counts ? kindsOverMax(platform, counts) : MEDIA_KINDS.filter((k) => max[k] !== undefined);
  const parts = kinds.map((k) => countLabel(max[k]!, LIMIT_LABELS[k]));
  if (maxItems !== undefined && (!counts || isOverMaxItems(platform, counts))) {
    parts.push(countLabel(maxItems, ['media item', 'media items']));
  }
  return parts.join(' and ');
}

/** Whether the post has more media than the platform takes, so the user can pick which items go. */
export function canPickMedia(platform: Platform, media: ReadonlyArray<PostMedia>): boolean {
  return overLimit(platform, mediaCounts(media)).length > 0;
}

/** Whether `chosen` names at least one of the post's items, only those, and stays within the platform's limits. */
export function isValidMediaPick(platform: Platform, media: ReadonlyArray<PostMedia>, chosen?: string[]): boolean {
  if (!chosen || chosen.length === 0) return false;
  const picked = media.filter((m) => chosen.includes(m.publicId));
  return picked.length === new Set(chosen).size && overLimit(platform, mediaCounts(picked)).length === 0;
}

/**
 * The media that goes to `platform`: all of it when the post is within the limits,
 * the user's pick when it is a valid one, all of it otherwise (the kinds over the
 * limit are then dropped by `fitContent`).
 */
export function pickMedia<T extends PostMedia>(platform: Platform, media: ReadonlyArray<T>, chosen?: string[]): T[] {
  if (canPickMedia(platform, media) && isValidMediaPick(platform, media, chosen)) {
    return media.filter((m) => chosen!.includes(m.publicId));
  }
  return [...media];
}

/** A starting pick for the chooser: the post's items in order, as many as the limits allow. */
export function defaultMediaPick(platform: Platform, media: ReadonlyArray<PostMedia>): string[] {
  const picked: PostMedia[] = [];
  for (const item of media) {
    if (overLimit(platform, mediaCounts([...picked, item])).length === 0) picked.push(item);
  }
  return picked.map((m) => m.publicId);
}

/** What goes to one platform, given the post and the user's choices for it. */
export interface ContentPlan<T extends PostMedia> {
  /** The media after the user's pick (before the kind selection). */
  media: T[];
  kinds: ContentKind[];
  counts: MediaCounts;
  fit: ContentFit;
  /** The post has more media than the platform takes, so items can be picked. */
  canPickMedia: boolean;
  /** The user picked a valid set of items. */
  mediaPicked: boolean;
  /** The kinds that go, or null when the platform gets nothing. */
  sent: ContentKind[] | null;
  /** The platform can take part of the post, but the user has not chosen which part yet. */
  needsChoice: boolean;
}

export function planContent<T extends PostMedia>(
  platform: Platform,
  hasText: boolean,
  media: ReadonlyArray<T>,
  selection: { kinds?: ContentKind[]; media?: string[] } = {}
): ContentPlan<T> {
  const canPick = canPickMedia(platform, media);
  const mediaPicked = canPick && isValidMediaPick(platform, media, selection.media);
  const picked = pickMedia(platform, media, selection.media);
  const kinds = sortKinds([...(hasText ? ['text' as const] : []), ...picked.map((m) => m.resourceType)]);
  const counts = mediaCounts(picked);
  const fit = fitContent(platform, kinds, counts);
  const sent = resolveContent(platform, kinds, selection.kinds, counts);
  const needsChoice =
    (fit.status === 'partial' && sent === null) || (fit.status === 'unsupported' && canPick && !mediaPicked);
  return { media: picked, kinds, counts, fit, canPickMedia: canPick, mediaPicked, sent, needsChoice };
}

/**
 * Checks what a request would send to `platform` against the platform's limits: the
 * picked media (or all of it), narrowed to the selected kinds (or all of them).
 * Returns the limits it breaks ("1 video"), or null when it is within them.
 */
export function limitError(
  platform: Platform,
  media: ReadonlyArray<PostMedia>,
  kinds?: ContentKind[],
  chosen?: string[]
): string | null {
  const picked = chosen ? media.filter((m) => chosen.includes(m.publicId)) : media;
  const sent = kinds ? picked.filter((m) => kinds.includes(m.resourceType)) : picked;
  const counts = mediaCounts(sent);
  return overLimit(platform, counts).length > 0 ? describeLimits(platform, counts) : null;
}

/** Parses an untrusted media selection: known platforms, IDs of the post's media; empty picks are dropped. */
export function parseMediaSelection(value: unknown, media: ReadonlyArray<PostMedia>): MediaSelection {
  const selection: MediaSelection = {};
  if (typeof value !== 'object' || value === null) return selection;
  const ids = media.map((m) => m.publicId);
  for (const [platform, chosen] of Object.entries(value)) {
    if (!(platform in PLATFORM_CONTENT_RULES) || !Array.isArray(chosen)) continue;
    const known = [...new Set(chosen.filter((id): id is string => typeof id === 'string' && ids.includes(id)))];
    if (known.length > 0) selection[platform as Platform] = known;
  }
  return selection;
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
