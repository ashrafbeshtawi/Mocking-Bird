import { getCloudinaryCloudName } from '@/lib/services/cloudinaryService';

/**
 * Media URLs come from the client (or from stored history), and the server downloads
 * them itself. Only assets on our own Cloudinary cloud are fetched, so a URL cannot
 * point the server at internal hosts, and every download is capped in time and size.
 */

export type MediaKind = 'image' | 'video';

const MB = 1024 * 1024;
/** Largest file downloaded per kind; anything bigger is refused before it fills memory. */
export const MEDIA_MAX_BYTES: Record<MediaKind, number> = { image: 25 * MB, video: 512 * MB };
/** How long one download, body included, may take. */
export const MEDIA_TIMEOUT_MS: Record<MediaKind, number> = { image: 60_000, video: 10 * 60_000 };

const CLOUDINARY_HOST = 'res.cloudinary.com';

function cloudName(): string | null {
  try {
    return getCloudinaryCloudName();
  } catch {
    return null;
  }
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whether `url` is an https asset on our Cloudinary cloud
 * (https://res.cloudinary.com/<cloud>/<image|video>/upload/...). With a publicId, the
 * path must also end in that asset (optionally followed by a file extension).
 */
export function isAllowedMediaUrl(url: unknown, publicId?: string): url is string {
  if (typeof url !== 'string') return false;
  const cloud = cloudName();
  if (!cloud) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== CLOUDINARY_HOST ||
    parsed.port !== '' ||
    parsed.username !== '' ||
    parsed.password !== ''
  ) {
    return false;
  }

  let path: string;
  try {
    path = decodeURIComponent(parsed.pathname);
  } catch {
    return false;
  }
  const prefix = `^/${escapeRegExp(cloud)}/(?:image|video)/upload/`;
  if (publicId === undefined) return new RegExp(prefix).test(path);
  if (!publicId) return false;
  return new RegExp(`${prefix}(?:.+/)?${escapeRegExp(publicId)}(?:\\.[A-Za-z0-9]+)?$`).test(path);
}

/**
 * A failed media download. `status` is set when the server answered with an error status;
 * `refused` when the URL or the file itself is not acceptable, so trying again cannot help.
 */
export class MediaFetchError extends Error {
  constructor(message: string, readonly details: { status?: number; refused?: boolean } = {}) {
    super(message);
    this.name = 'MediaFetchError';
  }
}

export interface FetchedMedia {
  bytes: Uint8Array;
  contentType: string | null;
}

/**
 * Downloads a media file from our Cloudinary cloud, refusing any other URL, giving up
 * after the kind's timeout and aborting as soon as the file exceeds the kind's size cap.
 */
export async function fetchMedia(
  url: string,
  kind: MediaKind,
  options: { publicId?: string; label?: string } = {}
): Promise<FetchedMedia> {
  const label = options.label ?? kind;
  if (!isAllowedMediaUrl(url, options.publicId)) {
    throw new MediaFetchError(
      `Refusing to download the ${label}: it is not a media file uploaded to this app's Cloudinary account.`,
      { refused: true }
    );
  }
  const maxBytes = MEDIA_MAX_BYTES[kind];
  const tooLarge = () =>
    new MediaFetchError(`The ${label} is larger than the ${Math.round(maxBytes / MB)} MB limit.`, { refused: true });

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS[kind]) });
  } catch (error) {
    throw new MediaFetchError(`Could not download the ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new MediaFetchError(`Could not download the ${label} (HTTP ${response.status})`, { status: response.status });
  }

  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw tooLarge();
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  if (response.body) {
    const reader = response.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw tooLarge();
        }
        chunks.push(value);
      }
    } catch (error) {
      if (error instanceof MediaFetchError) throw error;
      throw new MediaFetchError(`Could not download the ${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, contentType: response.headers.get('content-type') };
}
