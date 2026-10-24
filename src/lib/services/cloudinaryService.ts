import { v2 as cloudinary } from 'cloudinary';
import { MediaFile } from '@/types/interfaces';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CloudinaryService');

let isConfigured = false;

// Parse CLOUDINARY_URL and configure explicitly
// Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
function ensureConfigured() {
  if (isConfigured) return;

  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (!cloudinaryUrl) {
    logger.error('CLOUDINARY_URL environment variable is not set');
    throw new Error('CLOUDINARY_URL environment variable is not set');
  }

  // Parse the URL: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  const match = cloudinaryUrl.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);

  if (!match) {
    logger.error('Invalid CLOUDINARY_URL format', { url: cloudinaryUrl.substring(0, 20) + '...' });
    throw new Error('Invalid CLOUDINARY_URL format. Expected: cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
  }

  const [, apiKey, apiSecret, cloudName] = match;

  logger.info('Configuring Cloudinary', { cloudName, apiKeyPrefix: apiKey.substring(0, 6) + '...' });

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  isConfigured = true;
}

/** Cloud name from CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME), or null when unset. */
export function getCloudinaryCloudName(): string | null {
  const url = process.env.CLOUDINARY_URL;
  return url ? new URL(url).hostname : null;
}

export interface UploadedMedia {
  publicUrl: string;
  publicId: string;
  resourceType: 'image' | 'video';
  format: string;
  width?: number;
  height?: number;
}

export interface CloudinaryUploadError {
  message: string;
  filename: string;
}

/**
 * Uploads a media file to Cloudinary and returns the public URL
 */
export async function uploadToCloudinary(file: MediaFile): Promise<UploadedMedia> {
  // Ensure Cloudinary is configured before uploading
  ensureConfigured();

  logger.info('Uploading file to Cloudinary', {
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.buffer.length,
  });

  const isVideo = file.mimetype.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'mocking-bird/instagram',
        // Auto-delete after 24 hours (Instagram processing should be done by then)
        type: 'upload',
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload failed', {
            filename: file.filename,
            error: error.message,
          });
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }

        if (!result) {
          reject(new Error('Cloudinary returned no result'));
          return;
        }

        logger.info('Cloudinary upload successful', {
          filename: file.filename,
          publicId: result.public_id,
          url: result.secure_url,
        });

        resolve({
          publicUrl: result.secure_url,
          publicId: result.public_id,
          resourceType: resourceType,
          format: result.format,
          width: result.width,
          height: result.height,
        });
      }
    );

    // Write the buffer to the upload stream
    uploadStream.end(file.buffer);
  });
}

/**
 * Uploads multiple media files to Cloudinary
 */
export async function uploadMultipleToCloudinary(
  files: MediaFile[]
): Promise<{
  successful: UploadedMedia[];
  failed: CloudinaryUploadError[];
}> {
  logger.info('Uploading multiple files to Cloudinary', { count: files.length });

  const successful: UploadedMedia[] = [];
  const failed: CloudinaryUploadError[] = [];

  // Upload files in parallel
  const uploadPromises = files.map(async (file) => {
    try {
      const result = await uploadToCloudinary(file);
      successful.push(result);
    } catch (error) {
      failed.push({
        message: error instanceof Error ? error.message : 'Unknown upload error',
        filename: file.filename,
      });
    }
  });

  await Promise.all(uploadPromises);

  logger.info('Cloudinary batch upload complete', {
    successful: successful.length,
    failed: failed.length,
  });

  return { successful, failed };
}

/**
 * Ingests remote media URLs into Cloudinary so drafts reference assets we control
 * instead of external links that may expire. Cloudinary fetches the URLs itself.
 * Throws on the first URL that cannot be ingested, naming it in the message.
 */
export async function ingestRemoteMedia(urls: string[]): Promise<
  Array<UploadedMedia & { originalFilename: string }>
> {
  ensureConfigured();

  logger.info('Ingesting remote media into Cloudinary', { count: urls.length });

  return Promise.all(
    urls.map(async (url) => {
      try {
        const result = await cloudinary.uploader.upload(url, {
          resource_type: 'auto',
          folder: 'mocking-bird/drafts',
          type: 'upload',
        });
        return {
          publicUrl: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type === 'video' ? ('video' as const) : ('image' as const),
          format: result.format,
          width: result.width,
          height: result.height,
          originalFilename: url,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown upload error';
        logger.error('Remote media ingestion failed', { url, error: message });
        throw new Error(`Could not ingest media URL "${url}": ${message}`);
      }
    })
  );
}

// Same rules as thumbnails uploaded in the composer: JPEG, at most YouTube's 2 MB.
const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Copies a remote image into Cloudinary as a video thumbnail. It is stored as a JPEG
 * no larger than 1280px, the format and size every platform's thumbnail accepts.
 */
export async function ingestRemoteThumbnail(url: string): Promise<{ publicId: string; publicUrl: string }> {
  ensureConfigured();

  let result;
  try {
    result = await cloudinary.uploader.upload(url, {
      resource_type: 'image',
      folder: 'mocking-bird/drafts',
      type: 'upload',
      format: 'jpg',
      transformation: [{ width: 1280, height: 1280, crop: 'limit', quality: 'auto' }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upload error';
    logger.error('Remote thumbnail ingestion failed', { url, error: message });
    throw new Error(`Could not ingest thumbnail URL "${url}": ${message}`);
  }

  if (result.bytes > THUMBNAIL_MAX_BYTES) {
    await cloudinary.uploader.destroy(result.public_id, { resource_type: 'image' });
    throw new Error(`The thumbnail "${url}" is larger than 2 MB even as a JPEG.`);
  }
  return { publicId: result.public_id, publicUrl: result.secure_url };
}

/** A remote media URL, or a video URL with the URL of its custom thumbnail. */
export type RemoteMediaItem = string | { url: string; thumbnail_url?: string };

/** Ingests remote media and, for videos given one, their custom thumbnails. */
export async function ingestRemoteDraftMedia(items: RemoteMediaItem[]) {
  const media = await ingestRemoteMedia(items.map((item) => (typeof item === 'string' ? item : item.url)));
  return Promise.all(
    media.map(async (m, i) => {
      const item = items[i];
      if (typeof item === 'string' || !item.thumbnail_url) return m;
      if (m.resourceType !== 'video') {
        throw new Error(`thumbnail_url only applies to videos, and "${item.url}" is an image.`);
      }
      return { ...m, thumbnail: await ingestRemoteThumbnail(item.thumbnail_url) };
    })
  );
}

/**
 * Deletes a media file from Cloudinary by its public ID
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<void> {
  // Ensure Cloudinary is configured before deleting
  ensureConfigured();

  logger.info('Deleting file from Cloudinary', { publicId, resourceType });

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    logger.info('Cloudinary deletion successful', { publicId });
  } catch (error) {
    logger.error('Cloudinary deletion failed', {
      publicId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Deletes multiple media files from Cloudinary
 */
export async function deleteMultipleFromCloudinary(
  uploads: UploadedMedia[]
): Promise<void> {
  logger.info('Deleting multiple files from Cloudinary', { count: uploads.length });

  const deletePromises = uploads.map((upload) =>
    deleteFromCloudinary(upload.publicId, upload.resourceType).catch((error) => {
      logger.error('Failed to delete file from Cloudinary', {
        publicId: upload.publicId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    })
  );

  await Promise.all(deletePromises);
}

/**
 * Deletes Cloudinary media by public ID and resource type
 * Used for cleaning up client-uploaded media after publishing
 */
export async function cleanupCloudinaryMedia(
  media: Array<{ publicId: string; resourceType: 'image' | 'video' }>
): Promise<void> {
  if (media.length === 0) return;

  logger.info('Cleaning up Cloudinary media after publish', { count: media.length });

  const deletePromises = media.map((item) =>
    deleteFromCloudinary(item.publicId, item.resourceType).catch((error) => {
      logger.error('Failed to cleanup Cloudinary media', {
        publicId: item.publicId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    })
  );

  await Promise.all(deletePromises);
  logger.info('Cloudinary cleanup complete');
}
