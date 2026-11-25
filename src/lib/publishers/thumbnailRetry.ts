import { fetchMedia, MediaFetchError } from '@/lib/publish/mediaUrl';
import type { MediaThumbnail } from '@/lib/publish/types';

/** Waits before each retry of a thumbnail step: platforms often reject it while the video is still processing. */
export const THUMBNAIL_RETRY_DELAYS_MS = [2_000, 5_000, 10_000];

/** A failed thumbnail step that says whether trying again can help. */
export class ThumbnailError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = 'ThumbnailError';
  }
}

/** Statuses worth retrying: the video is not ready yet (404, 409), rate limits and server errors. */
export const isRetryableStatus = (status: number) => status === 404 || status === 409 || status === 429 || status >= 500;

/**
 * Downloads a custom thumbnail from our Cloudinary cloud. Failures become ThumbnailErrors:
 * refused URLs and oversized files are final, HTTP errors retry by status, network errors retry.
 */
export async function fetchThumbnail(thumbnail: MediaThumbnail): Promise<Uint8Array> {
  try {
    const { bytes } = await fetchMedia(thumbnail.publicUrl, 'image', { publicId: thumbnail.publicId, label: 'thumbnail' });
    return bytes;
  } catch (error) {
    if (!(error instanceof MediaFetchError)) throw error;
    const { status, refused } = error.details;
    throw new ThumbnailError(error.message, !refused && (status === undefined || isRetryableStatus(status)));
  }
}

/**
 * Runs a thumbnail step, retrying after each delay while it fails with a retryable error.
 * Errors that are not a ThumbnailError (e.g. network failures) count as retryable.
 * Throws the last error when every attempt failed.
 */
export async function retryThumbnail(
  step: () => Promise<void>,
  delaysMs: number[] = THUMBNAIL_RETRY_DELAYS_MS,
  onRetry?: (attempt: number, error: unknown) => void
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await step();
    } catch (error) {
      const retryable = !(error instanceof ThumbnailError) || error.retryable;
      if (!retryable || attempt > delaysMs.length) throw error;
      onRetry?.(attempt, error);
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt - 1]));
    }
  }
}
