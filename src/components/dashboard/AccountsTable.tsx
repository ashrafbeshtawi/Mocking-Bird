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
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
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
      <Typography
        variant="h5"
        component="h2"
        sx={{ mb: 2, mt: 6, fontWeight: 'bold' }}
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
                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name/Handle</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((account) => (
                <TableRow key={`${account.platform}-${account.id}`}>
                  <TableCell>{account.id}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.details || '-'}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
