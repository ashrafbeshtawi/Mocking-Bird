import { MediaFile } from '@/types/interfaces';
import { ProcessedMedia, ReportLogger, CloudinaryMediaInfo } from '../types';
import { createLogger } from '@/lib/logger';
import { fetchMedia } from '../mediaUrl';

const logger = createLogger('MediaValidator');

/**
 * Downloads a Cloudinary media file and returns it as a buffer
 */
async function downloadToBuffer(
  media: CloudinaryMediaInfo
): Promise<{ buffer: Buffer; contentType: string }> {
  const { bytes, contentType } = await fetchMedia(media.publicUrl, media.resourceType, {
    publicId: media.publicId,
    label: media.resourceType,
  });
  return {
    buffer: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    contentType: contentType || 'application/octet-stream',
  };
}

/**
 * Converts Cloudinary media info to MediaFile objects by downloading the files
 * This is needed for Facebook and Twitter which require file buffers
 */
export async function processCloudinaryMedia(
  cloudinaryMedia: CloudinaryMediaInfo[],
  reportLogger?: ReportLogger
): Promise<ProcessedMedia> {
  const processedFiles: MediaFile[] = [];
  const errors: string[] = [];

  if (cloudinaryMedia.length === 0) {
    return {
      files: [],
      errors: [],
      totalFiles: 0,
      allFailed: false,
    };
  }

  reportLogger?.add(`Processing ${cloudinaryMedia.length} Cloudinary media files`);

  for (const media of cloudinaryMedia) {
    try {
      reportLogger?.add(`Downloading ${media.originalFilename} from Cloudinary...`);

      const { buffer, contentType } = await downloadToBuffer(media);

      // Determine mimetype from Cloudinary info or downloaded content-type
      let mimetype = contentType;
      if (media.resourceType === 'image') {
        mimetype = `image/${media.format || 'jpeg'}`;
      } else if (media.resourceType === 'video') {
        mimetype = `video/${media.format || 'mp4'}`;
      }

      processedFiles.push({
        buffer,
        filename: media.originalFilename,
        mimetype,
        ...(media.thumbnail && { thumbnailUrl: media.thumbnail.publicUrl }),
      });

      reportLogger?.add(
        `Successfully downloaded: ${media.originalFilename} (${mimetype}, ${(buffer.length / 1024).toFixed(2)}KB)`
      );
    } catch (error) {
      const errorMsg = `Failed to download ${media.originalFilename}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      errors.push(errorMsg);
      logger.error(errorMsg, error);
    }
  }

  if (errors.length > 0) {
    reportLogger?.add(`WARN: Media processing errors: ${errors.join('; ')}`);
  }

  reportLogger?.add(
    `Media processing complete. Successfully processed: ${processedFiles.length}, Errors: ${errors.length}`
  );

  return {
    files: processedFiles,
    errors,
    totalFiles: cloudinaryMedia.length,
    allFailed: cloudinaryMedia.length > 0 && processedFiles.length === 0,
  };
}

/**
 * Converts CloudinaryMediaInfo to a simpler format for Instagram
 * Instagram can use URLs directly, no need to download
 */
export function getCloudinaryUrlsForInstagram(
  cloudinaryMedia: CloudinaryMediaInfo[]
): Array<{
  url: string;
  resourceType: 'image' | 'video';
  filename: string;
}> {
  return cloudinaryMedia.map((media) => ({
    url: media.publicUrl,
    resourceType: media.resourceType,
    filename: media.originalFilename,
  }));
}
