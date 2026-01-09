import { PublishRequest } from '../types';

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
  xAccounts: string[]
): ValidationResult<void> {
  if (!Array.isArray(facebookPages) || !Array.isArray(xAccounts)) {
    return {
      success: false,
      error: 'facebookPages and xAccounts must be arrays'
    };
  }

  if (facebookPages.length === 0 && xAccounts.length === 0) {
    return {
      success: false,
      error: 'At least one social media account must be selected'
    };
  }

  return { success: true };
}

/**
 * Parses FormData into a typed PublishRequest
 */
export async function parsePublishRequest(
  formData: FormData
): Promise<ValidationResult<PublishRequest>> {
  const text = formData.get('text') as string || '';
  const facebookPages = formData.getAll('facebookPages').map(String);
  const xAccounts = formData.getAll('xAccounts').map(String);
  const media = formData.getAll('media').filter((f) => typeof f !== 'string') as File[];

  return {
    success: true,
    data: {
      text,
      facebookPages,
      xAccounts,
      mediaFiles: media
    }
  };
}
