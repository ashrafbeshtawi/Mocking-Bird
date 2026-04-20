'use client';

import React from 'react';
import {
  Typography,
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
      {title && (
        <Typography
          sx={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 20,
            letterSpacing: '-0.02em',
            mb: 2,
            mt: 1,
          }}
        >
          {title}
        </Typography>
      )}

      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {emptyMessage}
        </Typography>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: { xs: 320, sm: 500 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Platform</TableCell>
                <TableCell>Name</TableCell>
                {showPromptSelector && (
                  <TableCell sx={{ width: 200 }}>AI Prompt</TableCell>
                )}
                <TableCell sx={{ width: 80 }}>Actions</TableCell>
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
                        icon={<PlatformIcon sx={{ fontSize: 14 }} />}
                        label={config.label}
                        size="small"
                        sx={{
                          bgcolor: config.color,
                          color: '#fff',
                          '& .MuiChip-icon': { color: '#fff' },
                          height: 24,
                          fontSize: 11,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                        {account.name}
                      </Typography>
                      {account.details && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
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
                    <TableCell>
                      <Tooltip title="Disconnect">
                        <span>
                          <IconButton
                            onClick={() => onDelete(account)}
                            size="small"
                            disabled={loadingId === account.id}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                          >
                            {loadingId === account.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <DeleteIcon sx={{ fontSize: 16 }} />
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
