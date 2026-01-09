'use client';

import { useState, useCallback, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type {
  ConnectedPage,
  ConnectedXAccount,
  InstagramAccount,
  AccountData,
} from '@/types/accounts';

interface UseConnectedAccountsReturn {
  // Raw data from APIs
  facebookPages: ConnectedPage[];
  xAccounts: ConnectedXAccount[];
  instagramAccounts: InstagramAccount[];
  // Normalized data for dashboard
  normalizedAccounts: {
    facebook: AccountData[];
    instagram: AccountData[];
    twitter: AccountData[];
  };
  // State
  loading: boolean;
  error: string | null;
  // Actions
  refetch: () => Promise<void>;
}

export function useConnectedAccounts(): UseConnectedAccountsReturn {
  const [facebookPages, setFacebookPages] = useState<ConnectedPage[]>([]);
  const [xAccounts, setXAccounts] = useState<ConnectedXAccount[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [fbRes, instaRes, twitterRes] = await Promise.allSettled([
        fetchWithAuth('/api/facebook/get-pages'),
        fetchWithAuth('/api/instagram'),
        fetchWithAuth('/api/twitter-v1.1/get-accounts'),
      ]);

      // Process Facebook pages
      if (fbRes.status === 'fulfilled' && fbRes.value.ok) {
        const data = await fbRes.value.json();
        setFacebookPages(data.pages || []);
      } else {
        setFacebookPages([]);
      }

      // Process Instagram accounts
      if (instaRes.status === 'fulfilled' && instaRes.value.ok) {
        const data = await instaRes.value.json();
        setInstagramAccounts(data.accounts || []);
      } else {
        setInstagramAccounts([]);
      }

      // Process X (Twitter) accounts
      if (twitterRes.status === 'fulfilled' && twitterRes.value.ok) {
        const data = await twitterRes.value.json();
        setXAccounts(data.accounts || []);
      } else {
        setXAccounts([]);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError((err as Error)?.message || 'Failed to fetch connected accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAccounts();
  }, [fetchAllAccounts]);

  // Normalize accounts for dashboard display
  const normalizedAccounts = {
    facebook: facebookPages.map((p) => ({
      id: p.page_id,
      name: p.page_name,
      platform: 'facebook' as const,
    })),
    instagram: instagramAccounts.map((a) => ({
      id: a.id,
      name: a.username,
      details: a.displayName,
      platform: 'instagram' as const,
    })),
    twitter: xAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      platform: 'twitter' as const,
    })),
  };

  return {
    facebookPages,
    xAccounts,
    instagramAccounts,
    normalizedAccounts,
    loading,
    error,
    refetch: fetchAllAccounts,
  };
}
