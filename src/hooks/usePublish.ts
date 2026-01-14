'use client';

import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { InstagramSelection } from '@/types/accounts';
import type { UploadedMedia } from '@/components/publish/MediaUploader';

interface PublishResult {
  platform: string;
  page_id?: string;
  account_id?: string;
  instagram_account_id?: string;
  error?: {
    message?: string;
    code?: string;
    details?: {
      error?: {
        error_user_msg?: string;
      };
    };
  };
}

interface PublishResults {
  successful: PublishResult[];
  failed: PublishResult[];
}

interface PublishParams {
  postText: string;
  uploadedMedia: UploadedMedia[];
  selectedFacebookPages: string[];
  selectedXAccounts: string[];
  selectedInstagramAccounts: Record<string, InstagramSelection>;
}

interface UsePublishReturn {
  isPublishing: boolean;
  error: { message: string; details?: unknown[] } | null;
  success: string | null;
  results: PublishResults | null;
  publish: (params: PublishParams) => Promise<boolean>;
  clearStatus: () => void;
}

export function usePublish(): UsePublishReturn {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<{ message: string; details?: unknown[] } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [results, setResults] = useState<PublishResults | null>(null);

  const clearStatus = useCallback(() => {
    setError(null);
    setSuccess(null);
    setResults(null);
  }, []);

  const publish = useCallback(
    async ({
      postText,
      uploadedMedia,
      selectedFacebookPages,
      selectedXAccounts,
      selectedInstagramAccounts,
    }: PublishParams): Promise<boolean> => {
      setIsPublishing(true);
      setError(null);
      setSuccess(null);

      // Validation
      const hasInstagramSelection = Object.values(selectedInstagramAccounts).some(
        (s) => s.publish || s.story
      );

      if (
        selectedFacebookPages.length === 0 &&
        selectedXAccounts.length === 0 &&
        !hasInstagramSelection
      ) {
        setError({ message: 'Please select at least one page or account to publish to.' });
        setIsPublishing(false);
        return false;
      }

      if (postText.trim() === '' && uploadedMedia.length === 0) {
        setError({ message: 'Post text or media cannot be empty.' });
        setIsPublishing(false);
        return false;
      }

      // Process Instagram selections
      const instagramPublishAccounts: string[] = [];
      const instagramStoryAccounts: string[] = [];

      Object.entries(selectedInstagramAccounts).forEach(([accountId, types]) => {
        if (types.publish) {
          instagramPublishAccounts.push(accountId);
        }
        if (types.story) {
          instagramStoryAccounts.push(accountId);
        }
      });

      // Build JSON payload with Cloudinary URLs (no file upload needed)
      const payload = {
        text: postText,
        facebookPages: selectedFacebookPages,
        xAccounts: selectedXAccounts,
        instagramPublishAccounts,
        instagramStoryAccounts,
        // Send Cloudinary media info instead of raw files
        cloudinaryMedia: uploadedMedia.map((media) => ({
          publicId: media.publicId,
          publicUrl: media.publicUrl,
          resourceType: media.resourceType,
          format: media.format,
          width: media.width,
          height: media.height,
          originalFilename: media.originalFilename,
        })),
      };

      try {
        const response = await fetchWithAuth('/api/publish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (response.status === 207) {
          // Partial success
          setResults(responseData);
          setSuccess(
            'Some posts were published successfully, but others failed. See details below.'
          );
          setError(null);
          setIsPublishing(false);
          return true;
        } else if (!response.ok) {
          setError({
            message: responseData.error || 'Failed to publish post.',
            details: responseData.details,
          });
          setSuccess(null);
          setResults(responseData);
          setIsPublishing(false);
          return false;
        } else {
          // Full success
          setSuccess('Your post has been published successfully!');
          setResults(responseData);
          setError(null);
          setIsPublishing(false);
          return true;
        }
      } catch (err) {
        console.error('Publishing error:', err);
        setError({
          message:
            (err as Error)?.message || 'An unexpected error occurred during publishing.',
        });
        setSuccess(null);
        setResults(null);
        setIsPublishing(false);
        return false;
      }
    },
    []
  );

  return {
    isPublishing,
    error,
    success,
    results,
    publish,
    clearStatus,
  };
}
