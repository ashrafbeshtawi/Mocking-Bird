import { PublishRequest, CloudinaryMediaInfo } from '../types';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates user ID from request headers
 */
export function validateUserId(headers: Headers): string | null {
  return headers.get('x-user-id');
}

/**
 * Validates that text content is provided when required
 */
export function validateTextContent(
  text: string | null,
  hasMedia: boolean,
  hasAccounts: boolean
): ValidationResult<string> {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    if (!hasMedia || !hasAccounts) {
      return {
        success: false,
        error: 'Post text is required when no media files are provided, or media files are required when text is empty'
      };
    }
  }
  return { success: true, data: text || '' };
}

/**
 * Validates that account arrays are valid
 */
export function validateAccountArrays(
  facebookPages: string[],
  xAccounts: string[],
  instagramPublishAccounts: string[] = [],
  instagramStoryAccounts: string[] = []
): ValidationResult<void> {
  if (!Array.isArray(facebookPages) || !Array.isArray(xAccounts)) {
    return {
      success: false,
      error: 'facebookPages and xAccounts must be arrays'
    };
  }

  if (!Array.isArray(instagramPublishAccounts) || !Array.isArray(instagramStoryAccounts)) {
    return {
      success: false,
      error: 'instagramPublishAccounts and instagramStoryAccounts must be arrays'
    };
  }

  const hasAnyAccount =
    facebookPages.length > 0 ||
    xAccounts.length > 0 ||
    instagramPublishAccounts.length > 0 ||
    instagramStoryAccounts.length > 0;

  if (!hasAnyAccount) {
    return {
      success: false,
      error: 'At least one social media account must be selected'
    };
  }

  return { success: true };
}

/**
 * Validates Cloudinary media info
 */
function validateCloudinaryMedia(media: unknown[]): ValidationResult<CloudinaryMediaInfo[]> {
  if (!Array.isArray(media)) {
    return { success: true, data: [] };
  }

  const validMedia: CloudinaryMediaInfo[] = [];
  for (const item of media) {
    if (
      typeof item === 'object' &&
      item !== null &&
      'publicId' in item &&
      'publicUrl' in item &&
      'resourceType' in item
    ) {
      const mediaItem = item as CloudinaryMediaInfo;
      if (
        typeof mediaItem.publicId === 'string' &&
        typeof mediaItem.publicUrl === 'string' &&
        (mediaItem.resourceType === 'image' || mediaItem.resourceType === 'video')
      ) {
        validMedia.push({
          publicId: mediaItem.publicId,
          publicUrl: mediaItem.publicUrl,
          resourceType: mediaItem.resourceType,
          format: mediaItem.format || '',
          width: mediaItem.width,
          height: mediaItem.height,
          originalFilename: mediaItem.originalFilename || 'unknown',
        });
      }
    }
  }

  return { success: true, data: validMedia };
}

/**
 * Parses JSON body into a typed PublishRequest
 */
export async function parsePublishRequest(
  body: unknown
): Promise<ValidationResult<PublishRequest>> {
  if (typeof body !== 'object' || body === null) {
    return { success: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;

  const text = typeof data.text === 'string' ? data.text : '';
  const facebookPages = Array.isArray(data.facebookPages)
    ? data.facebookPages.filter((id): id is string => typeof id === 'string')
    : [];
  const xAccounts = Array.isArray(data.xAccounts)
    ? data.xAccounts.filter((id): id is string => typeof id === 'string')
    : [];
  const instagramPublishAccounts = Array.isArray(data.instagramPublishAccounts)
    ? data.instagramPublishAccounts.filter((id): id is string => typeof id === 'string')
    : [];
  const instagramStoryAccounts = Array.isArray(data.instagramStoryAccounts)
    ? data.instagramStoryAccounts.filter((id): id is string => typeof id === 'string')
    : [];

  const mediaValidation = validateCloudinaryMedia(
    Array.isArray(data.cloudinaryMedia) ? data.cloudinaryMedia : []
  );

  if (!mediaValidation.success) {
    return { success: false, error: mediaValidation.error };
  }

  return {
    success: true,
    data: {
      text,
      facebookPages,
      xAccounts,
      instagramPublishAccounts,
      instagramStoryAccounts,
      cloudinaryMedia: mediaValidation.data || [],
    },
  };
}
