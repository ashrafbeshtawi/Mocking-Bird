import { MediaFile, SuccessfulPublishResult, FailedPublishResult } from '@/types/interfaces';
import type { ContentSelection } from './contentRules';
import type { TikTokPostSettings } from '@/lib/tiktok';

/** A custom thumbnail for a video: a JPEG uploaded to Cloudinary. */
export interface MediaThumbnail {
  publicId: string;
  publicUrl: string;
}

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
  /** Videos only: sent to the platforms that take a custom thumbnail or cover. */
  thumbnail?: MediaThumbnail;
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
  linkedinAccounts: string[];
  youtubeChannels: string[];
  /** Title for YouTube uploads; blank uses the video's file name. */
  youtubeTitle: string;
  tiktokAccounts: string[];
  tiktokSettings: TikTokPostSettings;
  cloudinaryMedia: CloudinaryMediaInfo[];
  /** Per platform, which kinds of the post to send; a platform without an entry gets everything. */
  contentSelection: ContentSelection;
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
  linkedin: string[];
  youtube: string[];
  tiktok: string[];
}
