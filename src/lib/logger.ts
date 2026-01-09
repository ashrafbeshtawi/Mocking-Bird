/**
 * Shared logger utility for consistent logging across the application.
 * Creates a prefixed logger with info, error, and warn methods.
 */

export interface Logger {
  info: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
}

export function createLogger(prefix: string): Logger {
  return {
    info: (message: string, data?: unknown) => {
      console.log(`[${prefix}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    error: (message: string, error?: unknown) => {
      console.error(`[${prefix}] ERROR: ${message}`, error);
    },
    warn: (message: string, data?: unknown) => {
      console.warn(`[${prefix}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  };
}
