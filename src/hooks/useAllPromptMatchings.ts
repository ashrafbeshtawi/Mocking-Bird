'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';

interface PromptMatching {
  account_id: string;
  prompt_id: number;
  prompt_title: string;
  provider_name: string | null;
}

interface AllPromptMatchings {
  facebook: PromptMatching[];
  twitter: PromptMatching[];
  instagram: PromptMatching[];
  telegram: PromptMatching[];
}

export function useAllPromptMatchings() {
  const [matchings, setMatchings] = useState<AllPromptMatchings>({
    facebook: [],
    twitter: [],
    instagram: [],
    telegram: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchMatchings = useCallback(async () => {
    setLoading(true);
    try {
      const [facebookRes, twitterRes, instagramRes, telegramRes] = await Promise.all([
        fetchWithAuth('/api/ai/prompt-matching/facebook'),
        fetchWithAuth('/api/ai/prompt-matching/twitter'),
        fetchWithAuth('/api/ai/prompt-matching/instagram'),
        fetchWithAuth('/api/ai/prompt-matching/telegram'),
      ]);

      const [facebookData, twitterData, instagramData, telegramData] = await Promise.all([
        facebookRes.json(),
        twitterRes.json(),
        instagramRes.json(),
        telegramRes.json(),
      ]);

      setMatchings({
        facebook: facebookData.matchings || [],
        twitter: twitterData.matchings || [],
        instagram: instagramData.matchings || [],
        telegram: telegramData.matchings || [],
      });
    } catch (error) {
      console.error('Failed to fetch prompt matchings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchings();
  }, [fetchMatchings]);

  // Helper to check if an account has AI transformation
  const hasAiTransformation = useCallback(
    (platform: 'facebook' | 'twitter' | 'instagram' | 'telegram', accountId: string): boolean => {
      const platformMatchings = matchings[platform];
      return platformMatchings.some((m) => m.account_id === accountId && m.provider_name);
    },
    [matchings]
  );

  // Get the prompt info for an account
  const getPromptInfo = useCallback(
    (platform: 'facebook' | 'twitter' | 'instagram' | 'telegram', accountId: string): PromptMatching | undefined => {
      const platformMatchings = matchings[platform];
      return platformMatchings.find((m) => m.account_id === accountId && m.provider_name);
    },
    [matchings]
  );

  return {
    matchings,
    loading,
    refetch: fetchMatchings,
    hasAiTransformation,
    getPromptInfo,
  };
}
