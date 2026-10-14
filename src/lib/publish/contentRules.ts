import type { Platform } from '@/types/accounts';

/** The kinds of content a post can carry. */
export type ContentKind = 'text' | 'image' | 'video';

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
}

export const PLATFORM_CONTENT_RULES: Record<Platform, PlatformContentRules> = {
  facebook: { supported: ['text', 'image', 'video'], mixes: 'all' },
  telegram: { supported: ['text', 'image', 'video'], mixes: 'all' },
  twitter: { supported: ['text', 'image', 'video'], mixes: [['text', 'image'], ['text', 'video']] },
  instagram: { supported: ['image', 'video'], mixes: [['text', 'image'], ['text', 'video']] },
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

export function isAllowed(platform: Platform, kinds: ContentKind[]): boolean {
  const { supported, mixes } = PLATFORM_CONTENT_RULES[platform];
  if (kinds.length === 0) return false;
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

export function fitContent(platform: Platform, kinds: ContentKind[]): ContentFit {
  if (isAllowed(platform, kinds)) return { status: 'ok' };
  const allowed = properSubsets(kinds).filter((s) => isAllowed(platform, s));
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
  selection?: ContentKind[]
): ContentKind[] | null {
  const fit = fitContent(platform, kinds);
  if (fit.status === 'ok') return kinds;
  if (fit.status === 'partial' && selection && fit.options.some((o) => sameKinds(o, selection))) {
    return sortKinds(selection);
  }
  return null;
}

const KIND_LABELS: Record<ContentKind, string> = { text: 'text', image: 'images', video: 'video' };

/** "text + images", "video" */
export function describeKinds(kinds: ContentKind[]): string {
  return sortKinds(kinds).map((k) => KIND_LABELS[k]).join(' + ');
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
