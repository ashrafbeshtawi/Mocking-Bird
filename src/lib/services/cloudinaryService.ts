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
