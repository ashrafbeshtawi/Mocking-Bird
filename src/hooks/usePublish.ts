'use client';

import { useState, useCallback, useRef } from 'react';
import type { InstagramSelection } from '@/types/accounts';
import type { UploadedMedia } from '@/components/publish/MediaUploader';

interface PublishResult {
  platform: string;
  page_id?: string;
  account_id?: string;
  instagram_account_id?: string;
  telegram_channel_id?: string;
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
  selectedTelegramChannels: string[];
}

interface ProgressUpdate {
  platform: string;
  action: 'starting' | 'completed' | 'failed';
  accountName?: string;
  current: number;
  total: number;
}

interface StatusUpdate {
  step: string;
  message: string;
  stepIndex?: number;
  totalSteps?: number;
}

interface StepProgress {
  stepIndex: number;
  totalSteps: number;
  subProgress?: {
    current: number;
    total: number;
  };
}

interface UsePublishReturn {
  isPublishing: boolean;
  error: { message: string; details?: unknown[] } | null;
  success: string | null;
  results: PublishResults | null;
  statusMessage: string;
  progress: ProgressUpdate | null;
  stepProgress: StepProgress | null;
  publish: (params: PublishParams) => Promise<boolean>;
  clearStatus: () => void;
}

export function usePublish(): UsePublishReturn {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<{ message: string; details?: unknown[] } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [results, setResults] = useState<PublishResults | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [stepProgress, setStepProgress] = useState<StepProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearStatus = useCallback(() => {
    setError(null);
    setSuccess(null);
    setResults(null);
    setStatusMessage('');
    setProgress(null);
    setStepProgress(null);
  }, []);

  const publish = useCallback(
    async ({
      postText,
      uploadedMedia,
      selectedFacebookPages,
      selectedXAccounts,
      selectedInstagramAccounts,
      selectedTelegramChannels,
    }: PublishParams): Promise<boolean> => {
      setIsPublishing(true);
      setError(null);
      setSuccess(null);
      setStatusMessage('Preparing...');
      setProgress(null);
      setStepProgress({ stepIndex: 0, totalSteps: 5 });

      // Validation
      const hasInstagramSelection = Object.values(selectedInstagramAccounts).some(
        (s) => s.publish || s.story
      );

      if (
        selectedFacebookPages.length === 0 &&
        selectedXAccounts.length === 0 &&
        !hasInstagramSelection &&
        selectedTelegramChannels.length === 0
      ) {
        setError({ message: 'Please select at least one page or account to publish to.' });
        setIsPublishing(false);
        setStatusMessage('');
        return false;
      }

      if (postText.trim() === '' && uploadedMedia.length === 0) {
        setError({ message: 'Post text or media cannot be empty.' });
        setIsPublishing(false);
        setStatusMessage('');
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
        telegramChannels: selectedTelegramChannels,
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

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/publish/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          credentials: 'include',
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError({
            message: errorData.error || 'Failed to publish post.',
            details: errorData.details,
          });
          setSuccess(null);
          setIsPublishing(false);
          setStatusMessage('');
          return false;
        }

        // Handle SSE stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to read response stream');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let publishSuccess = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7);
            } else if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                switch (currentEvent) {
                  case 'status':
                    const statusData = parsed as StatusUpdate;
                    setStatusMessage(statusData.message);
                    if (statusData.stepIndex !== undefined && statusData.totalSteps !== undefined) {
                      setStepProgress({
                        stepIndex: statusData.stepIndex,
                        totalSteps: statusData.totalSteps
                      });
                    }
                    break;

                  case 'progress':
                    const progressData = parsed as ProgressUpdate;
                    setProgress(progressData);
                    // Update step progress with sub-progress during publishing step (step 4)
                    setStepProgress(prev => ({
                      stepIndex: prev?.stepIndex || 4,
                      totalSteps: prev?.totalSteps || 5,
                      subProgress: {
                        current: progressData.current,
                        total: progressData.total
                      }
                    }));
                    if (progressData.action === 'starting') {
                      setStatusMessage(`Publishing to ${progressData.platform}${progressData.accountName ? ` (${progressData.accountName})` : ''}...`);
                    } else if (progressData.action === 'completed') {
                      setStatusMessage(`Published to ${progressData.platform}${progressData.accountName ? ` (${progressData.accountName})` : ''}`);
                    } else if (progressData.action === 'failed') {
                      setStatusMessage(`Failed to publish to ${progressData.platform}${progressData.accountName ? ` (${progressData.accountName})` : ''}`);
                    }
                    break;

                  case 'complete':
                    setResults({
                      successful: parsed.successful || [],
                      failed: parsed.failed || [],
                    });
                    if (parsed.status === 'success') {
                      setSuccess('Your post has been published successfully!');
                      publishSuccess = true;
                    } else if (parsed.status === 'partial_success') {
                      setSuccess('Some posts were published successfully, but others failed.');
                      publishSuccess = true;
                    } else {
                      setError({ message: parsed.message || 'All posts failed to publish.' });
                      publishSuccess = false;
                    }
                    break;

                  case 'error':
                    setError({
                      message: parsed.message || 'An error occurred during publishing.',
                      details: parsed.details,
                    });
                    publishSuccess = false;
                    break;
                }
              } catch (parseError) {
                console.error('Failed to parse SSE data:', parseError);
              }
            }
          }
        }

        setIsPublishing(false);
        setStatusMessage('');
        return publishSuccess;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setStatusMessage('Publishing cancelled');
          setIsPublishing(false);
          return false;
        }
        console.error('Publishing error:', err);
        setError({
          message:
            (err as Error)?.message || 'An unexpected error occurred during publishing.',
        });
        setSuccess(null);
        setResults(null);
        setIsPublishing(false);
        setStatusMessage('');
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
    statusMessage,
    progress,
    stepProgress,
    publish,
    clearStatus,
  };
}
