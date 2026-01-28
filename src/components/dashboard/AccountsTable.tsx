'use client';

import React from 'react';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';
import type { AccountData, Platform } from '@/types/accounts';
import { useAiPrompts } from '@/hooks/useAiPrompts';
import { useAllPromptMatchings } from '@/hooks/useAllPromptMatchings';
import { PromptSelector } from '@/components/ai';

interface AccountsTableProps {
  title: string;
  data: AccountData[];
  emptyMessage: string;
  loadingId: string | null;
  onDelete: (account: AccountData) => void;
  showPromptSelector?: boolean;
}


export function AccountsTable({
  title,
  data,
  emptyMessage,
  loadingId,
  onDelete,
  showPromptSelector = false,
}: AccountsTableProps) {
  const { prompts, loading: promptsLoading } = useAiPrompts();
  const { matchings, loading: matchingsLoading, refetch: refetchMatchings } = useAllPromptMatchings();

  const getMatchingForAccount = (platform: Platform, accountId: string) => {
    const platformMatchings = matchings[platform];
    return platformMatchings.find((m) => String(m.account_id) === String(accountId));
  };

  const setMatching = async (platform: Platform, accountId: string, promptId: number | null) => {
    try {
      const response = await fetch(`/api/ai/prompt-matching/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ account_id: accountId, prompt_id: promptId }),
      });
      if (response.ok) {
        refetchMatchings();
      }
    } catch (err) {
      console.error('Failed to set matching:', err);
    }
  };

  return (
    <>
      <Typography
        variant="h5"
        component="h2"
        sx={{ mb: 2, mt: 4, fontWeight: 'bold' }}
      >
        {title}
      </Typography>

      {data.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      ) : (
        <TableContainer component={Paper} elevation={3} sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Platform</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                {showPromptSelector && (
                  <TableCell sx={{ fontWeight: 'bold', width: 220 }}>AI Prompt</TableCell>
                )}
                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((account) => {
                const config = PLATFORM_CONFIG[account.platform];
                const PlatformIcon = config.icon;

                return (
                  <TableRow key={`${account.platform}-${account.id}`}>
                    <TableCell>
                      <Chip
                        icon={<PlatformIcon sx={{ fontSize: 18 }} />}
                        label={config.label}
                        size="small"
                        sx={{
                          bgcolor: config.color,
                          color: '#fff',
                          '& .MuiChip-icon': { color: '#fff' },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {account.name}
                      {account.details && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {account.details}
                        </Typography>
                      )}
                    </TableCell>
                    {showPromptSelector && (
                      <TableCell>
                        <PromptSelector
                          prompts={prompts}
                          selectedPromptId={getMatchingForAccount(account.platform, account.id)?.prompt_id || null}
                          onChange={(promptId) => setMatching(account.platform, account.id, promptId)}
                          loading={promptsLoading || matchingsLoading}
                          size="small"
                        />
                      </TableCell>
                    )}
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {account.id}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Disconnect Account">
                        <span>
                          <IconButton
                            onClick={() => onDelete(account)}
                            color="error"
                            disabled={loadingId === account.id}
                          >
                            {loadingId === account.id ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <DeleteIcon />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
