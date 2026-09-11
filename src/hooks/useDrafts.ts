'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { Draft, DraftInput } from '@/lib/drafts';
import type { UploadedMedia } from '@/components/publish/MediaUploader';

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
    deleteDraft,
  };
}
