'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { Draft, DraftInput } from '@/lib/drafts';

export type { Draft, DraftInput };

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/drafts?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch drafts');
      }
      const data = await response.json();
      setDrafts(data.drafts || []);
      setTotal(data.total ?? (data.drafts?.length || 0));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDraft = useCallback(async (id: number, input: DraftInput): Promise<Draft> => {
    const response = await fetchWithAuth('/api/drafts', {
      method: 'PUT',
      body: JSON.stringify({ id, ...input }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update draft');
    }
    setDrafts((prev) => {
      const next = prev.map((d) => (d.id === id ? data.draft : d));
      next.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
      return next;
    });
    return data.draft;
  }, []);

  const deleteDraft = useCallback(async (id: number): Promise<void> => {
    const response = await fetchWithAuth('/api/drafts', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to delete draft');
    }
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return {
    drafts,
    total,
    loading,
    error,
    refetch: fetchDrafts,
    updateDraft,
    deleteDraft,
  };
}
