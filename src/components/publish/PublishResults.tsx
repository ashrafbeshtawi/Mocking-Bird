'use client';

import React from 'react';
import { Alert, AlertTitle, Box, Typography } from '@mui/material';

interface PublishResult {
  platform: string;
  page_id?: string;
  account_id?: string;
  instagram_account_id?: string;
  error?: {
    message?: string;
    code?: string;
    details?: {
      error?: {
        error_user_msg?: string;
      };
    };
  };
}

interface PublishResultsProps {
  error: { message: string; details?: unknown[] } | null;
  success: string | null;
  results: { successful: PublishResult[]; failed: PublishResult[] } | null;
}

export function PublishResults({ error, success, results }: PublishResultsProps) {
  if (!error && !success) {
    return null;
  }

  const getAccountLabel = (item: PublishResult): string => {
    if (item.platform === 'facebook') {
      return `Facebook Page: ${item.page_id}`;
    }
    if (item.platform === 'instagram') {
      return `Instagram Account: ${item.instagram_account_id}`;
    }
    return `X Account: ${item.account_id}`;
  };

  return (
    <Alert severity={error ? 'error' : 'success'} sx={{ mb: 3 }}>
      <AlertTitle>{error ? 'Error' : 'Success'}</AlertTitle>
      {error ? error.message : success}

      {results?.successful && results.successful.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Successfully Published To:</Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            {results.successful.map((item, index) => (
              <Typography component="li" variant="body2" key={index}>
                {getAccountLabel(item)}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {results?.failed && results.failed.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="error">
            Failed To Publish To:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            {results.failed.map((item, index) => (
              <Typography component="li" variant="body2" key={index}>
                {getAccountLabel(item)}
                <br />
                <strong>Error:</strong> {item.error?.message || 'Unknown error'}
                {item.error?.code && (
                  <>
                    {' '}
                    <strong>Code:</strong> {item.error.code}
                  </>
                )}
                {item.error?.details?.error?.error_user_msg && (
                  <>
                    <br />
                    <strong>Details:</strong> {item.error.details.error.error_user_msg}
                  </>
                )}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Alert>
  );
}
