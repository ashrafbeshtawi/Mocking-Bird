'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { Draft, DraftInput } from '@/lib/drafts';
import type { UploadedMedia } from '@/components/publish/MediaUploader';
import type { Platform } from '@/types/accounts';

export type { Draft, DraftInput };

/** Turn stored draft media into the shape the composer and publisher expect. */
export function mapDraftMediaToUploaded(media: Draft['media']): UploadedMedia[] {
  return (media ?? []).map((m) => ({
    publicId: m.publicId ?? '',
    publicUrl: m.publicUrl,
    resourceType: m.resourceType ?? 'image',
    format: m.format ?? '',
    width: m.width,
    height: m.height,
    originalFilename: m.originalFilename ?? 'media',
    previewUrl: m.publicUrl,
  }));
}

export const DRAFTS_PAGE_SIZE = 20;

export interface DraftFilters {
  /** 1-based page number. */
  page: number;
  /** Substring search on the draft text; empty means no search. */
  query: string;
  /** Target platform, or 'all'. */
  platform: Platform | 'all';
}

export function useDrafts({ page, query, platform }: DraftFilters) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(DRAFTS_PAGE_SIZE),
        offset: String((page - 1) * DRAFTS_PAGE_SIZE),
      });
      if (query.trim()) params.set('q', query.trim());
      if (platform !== 'all') params.set('platform', platform);

      const response = await fetchWithAuth(`/api/drafts?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch drafts');
      }
      const data = await response.json();
      setDrafts(data.drafts || []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, query, platform]);

  /** Deletes the drafts with these ids; resolves to the number deleted. */
  const deleteDrafts = useCallback(async (ids: number[]): Promise<number> => {
    const response = await fetchWithAuth('/api/drafts', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete drafts');
    }
    return data.deletedCount ?? ids.length;
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return {
    drafts,
    total,
    totalPages: Math.max(1, Math.ceil(total / DRAFTS_PAGE_SIZE)),
    loading,
    error,
    refetch: fetchDrafts,
    deleteDrafts,
  };
}
