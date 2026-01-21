'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { AiProvider, AiProviderInput } from '@/types/ai';

export function useAiProviders() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/ai/providers');
      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const addProvider = async (input: AiProviderInput): Promise<boolean> => {
    try {
      const response = await fetchWithAuth('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add provider');
      }
      await fetchProviders();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const updateProvider = async (id: number, input: Partial<AiProviderInput>): Promise<boolean> => {
    try {
      const response = await fetchWithAuth('/api/ai/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...input }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update provider');
      }
      await fetchProviders();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const deleteProvider = async (id: number): Promise<boolean> => {
    try {
      const response = await fetchWithAuth('/api/ai/providers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete provider');
      }
      await fetchProviders();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  return {
    providers,
    loading,
    error,
    refetch: fetchProviders,
    addProvider,
    updateProvider,
    deleteProvider,
    clearError: () => setError(null),
  };
}
