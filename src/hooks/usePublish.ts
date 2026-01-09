'use client';

import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { InstagramSelection } from '@/types/accounts';

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
  mediaFiles: File[];
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
      mediaFiles,
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

      if (postText.trim() === '' && mediaFiles.length === 0) {
        setError({ message: 'Post text or media cannot be empty.' });
        setIsPublishing(false);
        return false;
      }

      // Build FormData
      const formData = new FormData();
      formData.append('text', postText);

      selectedFacebookPages.forEach((id) => formData.append('facebookPages', id));
      selectedXAccounts.forEach((id) => formData.append('xAccounts', id));

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

      instagramPublishAccounts.forEach((id) =>
        formData.append('instagramPublishAccounts', id)
      );
      instagramStoryAccounts.forEach((id) =>
        formData.append('instagramStoryAccounts', id)
      );

      mediaFiles.forEach((file) => formData.append('media', file));

      try {
        const response = await fetchWithAuth('/api/publish', {
          method: 'POST',
          body: formData,
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
