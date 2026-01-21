'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { PromptMatching } from '@/types/ai';

type Platform = 'facebook' | 'twitter' | 'instagram' | 'telegram';

export function usePromptMatching(platform: Platform) {
  const [matchings, setMatchings] = useState<PromptMatching[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatchings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/ai/prompt-matching/${platform}`);
      if (!response.ok) {
        throw new Error('Failed to fetch matchings');
      }
      const data = await response.json();
      setMatchings(data.matchings || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    fetchMatchings();
  }, [fetchMatchings]);

  const setMatching = async (accountId: string | number, promptId: number | null): Promise<boolean> => {
    try {
      const response = await fetchWithAuth(`/api/ai/prompt-matching/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, prompt_id: promptId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set matching');
      }
      await fetchMatchings();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const removeMatching = async (accountId: string | number): Promise<boolean> => {
    try {
      const response = await fetchWithAuth(`/api/ai/prompt-matching/${platform}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove matching');
      }
      await fetchMatchings();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const getMatchingForAccount = (accountId: string | number): PromptMatching | undefined => {
    return matchings.find((m) => String(m.account_id) === String(accountId));
  };

  return {
    matchings,
    loading,
    error,
    refetch: fetchMatchings,
    setMatching,
    removeMatching,
    getMatchingForAccount,
    clearError: () => setError(null),
  };
}
