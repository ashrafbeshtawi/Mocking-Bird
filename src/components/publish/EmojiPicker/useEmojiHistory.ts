'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'emojiHistory';
const MAX_HISTORY = 16;

interface UseEmojiHistoryReturn {
  history: string[];
  pendingHistory: string[];
  addToPending: (emoji: string) => void;
  commitPending: () => void;
  initPending: () => void;
  clearHistory: () => void;
}

export function useEmojiHistory(): UseEmojiHistoryReturn {
  const [history, setHistory] = useState<string[]>([]);
  const [pendingHistory, setPendingHistory] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  // Initialize pending with current history (called when popover opens)
  const initPending = useCallback(() => {
    setPendingHistory([...history]);
  }, [history]);

  // Add emoji to pending history (doesn't reorder visible history yet)
  const addToPending = useCallback((emoji: string) => {
    setPendingHistory((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      return [emoji, ...filtered];
    });
  }, []);

  // Commit pending to actual history (called when popover closes)
  const commitPending = useCallback(() => {
    if (pendingHistory.length > 0) {
      const updated = pendingHistory.slice(0, MAX_HISTORY);
      setHistory(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }, [pendingHistory]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setPendingHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    history,
    pendingHistory,
    addToPending,
    commitPending,
    initPending,
    clearHistory,
  };
}
