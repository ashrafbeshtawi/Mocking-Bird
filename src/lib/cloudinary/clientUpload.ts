'use client';

/**
 * Client-side Cloudinary upload utility
 * Uploads files directly from the browser to Cloudinary to bypass Vercel's 4.5MB payload limit
 */

export interface CloudinaryUploadResult {
  publicId: string;
  publicUrl: string;
  resourceType: 'image' | 'video';
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  originalFilename: string;
}

export interface CloudinaryUploadError {
  filename: string;
  message: string;
}

export interface CloudinaryBatchResult {
  successful: CloudinaryUploadResult[];
  failed: CloudinaryUploadError[];
}

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a single file to Cloudinary directly from the browser
 */
export async function uploadToCloudinaryClient(
  file: File,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary client configuration is missing. Check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variables.');
  }

  const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'mocking-bird/uploads');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            publicId: response.public_id,
            publicUrl: response.secure_url,
            resourceType: response.resource_type as 'image' | 'video',
            format: response.format,
            width: response.width,
            height: response.height,
            bytes: response.bytes,
            originalFilename: file.name,
          });
        } catch {
          reject(new Error(`Failed to parse Cloudinary response for ${file.name}`));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.error?.message || `Upload failed for ${file.name}`));
        } catch {
          reject(new Error(`Upload failed for ${file.name}: ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error(`Network error while uploading ${file.name}`));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error(`Upload aborted for ${file.name}`));
    });

    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}

/**
 * Upload multiple files to Cloudinary in parallel
 */
export async function uploadMultipleToCloudinaryClient(
  files: File[],
  onFileProgress?: (filename: string, progress: number) => void,
  onOverallProgress?: (completedCount: number, totalCount: number) => void
): Promise<CloudinaryBatchResult> {
  const successful: CloudinaryUploadResult[] = [];
  const failed: CloudinaryUploadError[] = [];
  let completedCount = 0;

  const uploadPromises = files.map(async (file) => {
    try {
      const result = await uploadToCloudinaryClient(file, (progress) => {
        onFileProgress?.(file.name, progress);
      });
      successful.push(result);
    } catch (error) {
      failed.push({
        filename: file.name,
        message: error instanceof Error ? error.message : 'Unknown upload error',
      });
    } finally {
      completedCount++;
      onOverallProgress?.(completedCount, files.length);
    }
  });

  await Promise.all(uploadPromises);

  return { successful, failed };
}

/**
 * Check if Cloudinary client upload is configured
 */
export function isCloudinaryClientConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}
