/** A file stored in Cloudinary, as the destroy API needs it. */
export interface MediaAsset {
  publicId: string;
  resourceType: 'image' | 'video';
}

interface StoredMediaItem {
  publicId?: unknown;
  resourceType?: unknown;
  thumbnail?: { publicId?: unknown } | null;
}

/**
 * The Cloudinary files behind stored media items (drafts.media, publish_history.media):
 * each item's own file plus a video's custom thumbnail, an image of its own.
 * Untrusted JSON, so malformed entries are skipped rather than thrown on.
 */
export function mediaAssets(items: unknown): MediaAsset[] {
  if (!Array.isArray(items)) return [];
  return (items as Array<StoredMediaItem | null>).flatMap((item): MediaAsset[] => [
    ...(typeof item?.publicId === 'string' && (item.resourceType === 'image' || item.resourceType === 'video')
      ? [{ publicId: item.publicId, resourceType: item.resourceType as MediaAsset['resourceType'] }]
      : []),
    ...(typeof item?.thumbnail?.publicId === 'string'
      ? [{ publicId: item.thumbnail.publicId, resourceType: 'image' as const }]
      : []),
  ]);
}
