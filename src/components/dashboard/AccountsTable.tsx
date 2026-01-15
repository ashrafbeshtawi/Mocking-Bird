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
import {
  Delete as DeleteIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter as TwitterIcon,
  Telegram as TelegramIcon,
} from '@mui/icons-material';
import type { AccountData, Platform } from '@/types/accounts';

interface AccountsTableProps {
  title: string;
  data: AccountData[];
  emptyMessage: string;
  loadingId: string | null;
  onDelete: (account: AccountData) => void;
}

const platformConfig: Record<Platform, { label: string; icon: typeof FacebookIcon; color: string }> = {
  facebook: {
    label: 'Facebook',
    icon: FacebookIcon,
    color: '#1877f2',
  },
  instagram: {
    label: 'Instagram',
    icon: InstagramIcon,
    color: '#E1306C',
  },
  twitter: {
    label: 'X',
    icon: TwitterIcon,
    color: '#000',
  },
  telegram: {
    label: 'Telegram',
    icon: TelegramIcon,
    color: '#0088cc',
  },
};

export function AccountsTable({
  title,
  data,
  emptyMessage,
  loadingId,
  onDelete,
}: AccountsTableProps) {
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
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Platform</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((account) => {
                const config = platformConfig[account.platform];
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
