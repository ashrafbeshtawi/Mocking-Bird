import { MediaFile, SuccessfulPublishResult, FailedPublishResult } from '@/types/interfaces';

/**
 * Cloudinary media info sent from the frontend
 */
export interface CloudinaryMediaInfo {
  publicId: string;
  publicUrl: string;
  resourceType: 'image' | 'video';
  format: string;
  width?: number;
  height?: number;
  originalFilename: string;
}

/**
 * Parsed publish request data from JSON
 */
export interface PublishRequest {
  text: string;
  facebookPages: string[];
  xAccounts: string[];
  instagramPublishAccounts: string[];
  instagramStoryAccounts: string[];
  telegramChannels: string[];
  cloudinaryMedia: CloudinaryMediaInfo[];
}

/**
 * Result of media processing
 */
export interface ProcessedMedia {
  files: MediaFile[];
  errors: string[];
  totalFiles: number;
  allFailed: boolean;
}

/**
 * Context passed through the publish flow
 */
export interface PublishContext {
  userId: string;
  media: ProcessedMedia;
  reportLogger: ReportLogger;
}

/**
 * Report logger for accumulating publish reports
 */
export interface ReportLogger {
  add: (message: string) => void;
  getReport: () => string[];
}

/**
 * Result of the publish orchestration
 */
export interface PublishOrchestrationResult {
  successful: SuccessfulPublishResult[];
  failed: FailedPublishResult[];
  contentToStore: string;
}

/**
 * Status of the publish operation
 */
export type PublishStatus = 'success' | 'partial_success' | 'failed';

/**
 * Missing accounts detected during token validation
 */
export interface MissingAccounts {
  facebook: string[];
  twitter: string[];
  instagram: string[];
  telegram: string[];
}
