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
import type { AccountData } from '@/types/accounts';

interface AccountsTableProps {
  title: string;
  data: AccountData[];
  emptyMessage: string;
  loadingId: string | null;
  onDelete: (account: AccountData) => void;
}

export function AccountsTable({
  title,
  data,
  emptyMessage,
  loadingId,
  onDelete,
}: AccountsTableProps) {
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
