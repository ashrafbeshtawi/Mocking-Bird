// Define the structure for a single failed publish result
export interface FailedPublishResult {
  platform: string;
  page_id?: string;
  account_id?: string;
  error?: {
    message?: string;
    code?: string;
    details?: { // Added details based on user feedback
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

// Define the structure for a single successful publish result
// This is a guess, as the exact structure for successful results isn't provided.
// It's assumed to have at least a platform and an identifier.
export interface SuccessfulPublishResult {
  platform: string;
  post_id?: string; // e.g., for Facebook post ID
  tweet_id?: string; // e.g., for Twitter tweet ID
  page_id?: string; // For Facebook pages
  account_id?: string; // For X accounts
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
      detail?: string;
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
    data?: {
      id?: string;
    };
  };
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
