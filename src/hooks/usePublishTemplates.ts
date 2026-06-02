'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';

export interface PublishTemplate {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function usePublishTemplates() {
  const [templates, setTemplates] = useState<PublishTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/publish/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(
    async (title: string, content: string): Promise<PublishTemplate> => {
      const response = await fetchWithAuth('/api/publish/templates', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create template');
      }
      setTemplates((prev) => [data.template, ...prev]);
      return data.template;
    },
    []
  );

  const updateTemplate = useCallback(
    async (id: number, title: string, content: string): Promise<PublishTemplate> => {
      const response = await fetchWithAuth('/api/publish/templates', {
        method: 'PUT',
        body: JSON.stringify({ id, title, content }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update template');
      }
      setTemplates((prev) => {
        const next = prev.map((t) => (t.id === id ? data.template : t));
        next.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
        return next;
      });
      return data.template;
    },
    []
  );

  const deleteTemplate = useCallback(async (id: number): Promise<void> => {
    const response = await fetchWithAuth('/api/publish/templates', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to delete template');
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
