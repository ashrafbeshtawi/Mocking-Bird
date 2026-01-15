// Define the structure for a single failed publish result
export interface FailedPublishResult {
  platform: string;
  page_id?: string;
  account_id?: string;
  instagram_account_id?: string;
  telegram_channel_id?: string;
  post_type?: 'feed' | 'story';
  error?: {
    message?: string;
    code?: string;
    details?: { // Added details based on user feedback
      error?: { // Facebook/Instagram specific
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        is_transient?: boolean;
        error_user_title?: string;
        error_user_msg?: string;
        fbtrace_id?: string;
      };
      errors?: Array<{ message?: string; code?: number }>; // Twitter specific
    };
  };
}

// Define the structure for a single successful publish result
// This is a guess, as the exact structure for successful results isn't provided.
// It's assumed to have at least a platform and an identifier.
export interface SuccessfulPublishResult {
  platform: string;
  post_id?: string; // e.g., for Facebook post ID
  tweet_id?: string; // e.g., for Twitter tweet ID
  page_id?: string; // For Facebook pages
  account_id?: string; // For X accounts
  instagram_account_id?: string; // For Instagram accounts
  instagram_media_id?: string; // For Instagram media ID
  telegram_channel_id?: string; // For Telegram channels
  telegram_message_id?: string; // For Telegram message ID
  post_type?: 'feed' | 'story'; // For Instagram post type
}

// Define the overall structure for publish results
export interface PublishResults {
  successful: SuccessfulPublishResult[];
  failed: FailedPublishResult[];
}

// Define the structure for media processing errors
export interface MediaProcessingError {
  message: string;
}

// Define the structure for media processing details
export interface MediaProcessing {
  totalFiles: number;
  processedFiles: number;
  errors: MediaProcessingError[];
}

// Define the structure for the response data
export interface PublishResponseData {
  successful: SuccessfulPublishResult[];
  failed: FailedPublishResult[];
  publishReport: string;
  mediaProcessing?: MediaProcessing;
}

// Internal interfaces used within the publish route
export interface FacebookFailedItem {
  platform: string;
  page_id?: string;
  error?: {
    message?: string;
    code?: string;
    details?: {
      error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        is_transient?: boolean;
        error_user_title?: string;
        error_user_msg?: string;
        fbtrace_id?: string;
      };
    };
  };
}

export interface TwitterFailedItem {
  platform: string;
  account_id?: string;
  error?: {
    message?: string;
    code?: string;
    details?: {
      errors?: Array<{ message?: string; code?: number }>;
    };
  };
}

export interface FacebookSuccessItem {
  platform: string;
  page_id?: string;
  result?: {
    id?: string;
  };
}

export interface TwitterSuccessItem {
  platform: string;
  account_id?: string;
  result?: {
    id?: string;
    id_str?: string;
    data?: {
      id?: string;
    };
  };
}

export interface InstagramFailedItem {
  platform: 'instagram';
  instagram_account_id: string;
  post_type: 'feed' | 'story';
  error?: {
    message?: string;
    code?: string;
    details?: {
      error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        is_transient?: boolean;
        error_user_title?: string;
        error_user_msg?: string;
        fbtrace_id?: string;
      };
    };
  };
}

export interface InstagramSuccessItem {
  platform: 'instagram';
  instagram_account_id: string;
  post_type: 'feed' | 'story';
  result?: {
    id?: string;
  };
}

export interface TelegramFailedItem {
  platform: 'telegram';
  channel_id: string;
  channel_title: string;
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
}

export interface TelegramSuccessItem {
  platform: 'telegram';
  channel_id: string;
  channel_title: string;
  message_id: number;
  chat_id: string;
}

export interface ApiResponse {
  publishReport: string;
  message?: string;
  error?: string;
  details?: string[];
  successful?: SuccessfulPublishResult[];
  failed?: FailedPublishResult[];
  mediaProcessing?: MediaProcessing;
  results?: SuccessfulPublishResult[];
}

export interface MediaFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

export interface TwitterMediaUploadResult {
  media_key: string;
  media_id: string;
  media_id_string: string;
  size: number;
  expires_after_secs: number;
  image?: {
    image_type: string;
    w: number;
    h: number;
  };
  video?: {
    video_type: string;
  };
}
