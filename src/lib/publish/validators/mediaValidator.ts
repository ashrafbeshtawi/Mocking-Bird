import { MediaFile } from '@/types/interfaces';
import { ProcessedMedia, ReportLogger } from '../types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('MediaValidator');

const IMAGE_MAX_SIZE = 15 * 1024 * 1024; // 15MB
const VIDEO_MAX_SIZE = 512 * 1024 * 1024; // 512MB

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a single media file for type and size
 */
export function validateMediaFile(file: File): FileValidationResult {
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    return {
      valid: false,
      error: `File ${file.name}: Unsupported file type ${file.type}. Only images and videos are supported.`
    };
  }

  const maxSize = file.type.startsWith('image/') ? IMAGE_MAX_SIZE : VIDEO_MAX_SIZE;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File ${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${maxSize / 1024 / 1024}MB.`
    };
  }

  return { valid: true };
}

/**
 * Checks if media files contain mixed types (images and videos)
 */
export function validateMediaMix(mediaFiles: MediaFile[]): { mixed: boolean; imageCount: number; videoCount: number } {
  let imageCount = 0;
  let videoCount = 0;

  for (const file of mediaFiles) {
    if (file.mimetype.startsWith('image/')) {
      imageCount++;
    } else if (file.mimetype.startsWith('video/')) {
      videoCount++;
    }
  }

  return {
    mixed: imageCount > 0 && videoCount > 0,
    imageCount,
    videoCount
  };
}

/**
 * Processes an array of files into MediaFile objects
 */
export async function processMediaFiles(
  files: File[],
  reportLogger?: ReportLogger
): Promise<ProcessedMedia> {
  const processedFiles: MediaFile[] = [];
  const errors: string[] = [];

  if (files.length === 0) {
    return {
      files: [],
      errors: [],
      totalFiles: 0,
      allFailed: false
    };
  }

  reportLogger?.add(`Processing ${files.length} media files`);

  for (const file of files) {
    const validation = validateMediaFile(file);

    if (!validation.valid) {
      errors.push(validation.error!);
      continue;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      processedFiles.push({
        buffer,
        filename: file.name,
        mimetype: file.type
      });

      reportLogger?.add(`Successfully processed media file: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)}KB)`);
    } catch (error) {
      const errorMsg = `Failed to process media file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error);
    }
  }

  if (errors.length > 0) {
    reportLogger?.add(`WARN: Media processing errors encountered: ${errors.join('; ')}`);
  }

  reportLogger?.add(`Media processing complete. Successfully processed: ${processedFiles.length}, Errors: ${errors.length}`);

  return {
    files: processedFiles,
    errors,
    totalFiles: files.length,
    allFailed: files.length > 0 && processedFiles.length === 0
  };
}
