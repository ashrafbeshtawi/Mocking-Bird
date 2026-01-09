'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  useTheme,
  Paper,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface ReportData {
  id: number;
  content: string;
  publish_status: 'success' | 'partial_success' | 'failed';
  created_at: string;
  publish_report?: string; // Added publish_report
}

export default function ReportPage() {
  const theme = useTheme();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id');
  const historyPage = searchParams.get('page') || '1';

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Assuming there's an API endpoint to fetch a single report by ID
      const response = await fetch(`/api/publish/publish-history?id=${id}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend error: ${response.statusText}`);
      }

      const result: ReportData = await response.json();
      setReport(result);
    } catch (err: unknown) {
      console.error('Error fetching report:', err);
      setError((err as Error)?.message || 'An unexpected error occurred while fetching the report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (reportId) {
      fetchReport(reportId);
    } else {
      setLoading(false);
      setError('No report ID provided.');
    }
  }, [fetchReport, reportId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!report) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">
          <AlertTitle>Information</AlertTitle>
          Report not found.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Link href={`/history?page=${historyPage}`} passHref>
          <Button variant="outlined" startIcon={<ArrowBackIcon />}>
            Back to History
          </Button>
        </Link>
      </Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: theme.typography.fontWeightBold, mb: 3 }}>
        Publish Report for ID: {report.id}
      </Typography>

      <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Content:
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
          {report.content}
        </Typography>

        <Typography variant="h6" gutterBottom>
          Status:
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {report.publish_status}
        </Typography>

        <Typography variant="h6" gutterBottom>
          Published At:
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {new Date(report.created_at).toLocaleString()}
        </Typography>

        {report.publish_report && (
          <>
            <Typography variant="h6" gutterBottom>
              Publish Log:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: theme.palette.grey[50] }}>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                {report.publish_report}
              </Typography>
            </Paper>
          </>
        )}
      </Paper>
    </Container>
  );
}
