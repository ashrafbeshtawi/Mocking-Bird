'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  Container,
  Typography,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  AutoAwesome as SparkleIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts';
import { useFacebookSDK, initiateTwitterAuth } from '@/hooks/useFacebookSDK';
import { fetchWithAuth } from '@/lib/fetch';
import { ConfirmDisconnectDialog } from '@/components/dashboard/ConfirmDisconnectDialog';
import { TelegramConnectDialog } from '@/components/dashboard/TelegramConnectDialog';
import { ConnectButtons } from '@/components/dashboard/ConnectButtons';
import { AccountsTable } from '@/components/dashboard/AccountsTable';
import type { AccountData } from '@/types/accounts';
import { API_CONFIG } from '@/types/accounts';
import type { TimeRange } from '@/types/analytics';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatEyebrow(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const day = now.getDate();
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday} \u00b7 ${day} ${month}`;
}

const SUGGESTIONS = [
  'Schedule posts during peak engagement hours (9-11 AM and 7-9 PM) to maximise reach across platforms.',
  'Use AI content adaptation to tailor your message tone for each platform audience automatically.',
  'Connect at least one account per platform to enable full cross-posting from a single composer.',
];


/* ------------------------------------------------------------------ */
/*  Shared style tokens                                                */
/* ------------------------------------------------------------------ */

const monoLabel = {
  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  fontWeight: 500,
};

const fraunces = 'var(--font-fraunces), Georgia, serif';

const cardSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 4,
  p: 2.25,
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  /* --- Analytics state --- */
  const [analyticsRange, setAnalyticsRange] = useState<TimeRange>('30d');
  const { data: analytics, loading: analyticsLoading } = useAnalytics(analyticsRange);

  /* --- Connected accounts state --- */
  const { normalizedAccounts, loading, refetch } = useConnectedAccounts();
  const { login: facebookLogin, isLoading: fbConnecting } = useFacebookSDK();

  /* --- UI state (kept from original) --- */
  const [status, setStatus] = useState<{ error: string | null; success: string | null }>({
    error: null,
    success: null,
  });
  const [twitterConnecting, setTwitterConnecting] = useState(false);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    account: AccountData | null;
  }>({ open: false, account: null });

  const eyebrow = useMemo(() => formatEyebrow(), []);

  /* --- Callbacks (kept from original) --- */
  const handleFacebookConnect = useCallback(() => {
    setStatus({ error: null, success: null });
    facebookLogin(
      async (accessToken) => {
        try {
          const response = await fetchWithAuth('/api/facebook/save-page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortLivedUserToken: accessToken }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to connect Facebook page');
          setStatus({ error: null, success: data.message || 'Facebook Page connected!' });
          refetch();
        } catch (err) {
          setStatus({ error: (err as Error).message, success: null });
        }
      },
      () => {
        setStatus({ error: 'Facebook login cancelled.', success: null });
      }
    );
  }, [facebookLogin, refetch]);

  const handleTwitterConnect = useCallback(async () => {
    setTwitterConnecting(true);
    setStatus({ error: null, success: null });
    try {
      await initiateTwitterAuth();
    } catch (err) {
      setStatus({ error: (err as Error).message, success: null });
      setTwitterConnecting(false);
    }
  }, []);

  const handleTelegramSuccess = useCallback(() => {
    setStatus({ error: null, success: 'Telegram channel connected successfully!' });
    refetch();
  }, [refetch]);

  const handleDeleteAccount = useCallback(
    async (account: AccountData) => {
      setDeletingId(account.id);
      setStatus({ error: null, success: null });
      const config = API_CONFIG[account.platform];
      try {
        const response = await fetchWithAuth(config.deleteUrl, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [config.idParamName]: account.id }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to disconnect account');
        setStatus({ error: null, success: 'Account disconnected successfully.' });
        refetch();
      } catch (err) {
        setStatus({ error: (err as Error).message, success: null });
      } finally {
        setDeletingId(null);
      }
    },
    [refetch]
  );

  const promptDelete = (account: AccountData) => {
    setConfirmDialog({ open: true, account });
  };

  const confirmDelete = () => {
    if (confirmDialog.account) handleDeleteAccount(confirmDialog.account);
    setConfirmDialog({ open: false, account: null });
  };

  /* --- Derived data --- */
  const summary = analytics?.summary;
  const activityChart = analytics?.activityChart;

  const allAccounts: AccountData[] = useMemo(
    () => [
      ...normalizedAccounts.facebook,
      ...normalizedAccounts.instagram,
      ...normalizedAccounts.twitter,
      ...normalizedAccounts.telegram,
    ],
    [normalizedAccounts]
  );

  /* --- Chart helpers --- */
  const chartLabels = activityChart?.labels ?? [];
  const chartValues = activityChart?.success ?? [];
  const maxChartVal = Math.max(...chartValues, 1);

  // Determine how many bars to show based on selected range
  const visibleBars = analyticsRange === '7d' ? 7 : analyticsRange === '30d' ? 13 : 20;
  const displayLabels = chartLabels.slice(-visibleBars);
  const displayValues = chartValues.slice(-visibleBars);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        {/* ---------- Header ---------- */}
        <PageHeader
          eyebrow={eyebrow}
          title={
            <>
              Good morning,{' '}
              <Box component="span" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                Dashboard
              </Box>
              .
            </>
          }
          lead="Your social media command centre. Review performance, manage accounts, and plan upcoming posts."
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<CalendarIcon />}
            component={Link}
            href="/history"
            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 500 }}
          >
            History
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            component={Link}
            href="/publish"
            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 500 }}
          >
            New post
          </Button>
        </PageHeader>

        {/* Alerts */}
        {status.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {status.error}
          </Alert>
        )}
        {status.success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <AlertTitle>Success</AlertTitle>
            {status.success}
          </Alert>
        )}

        {/* ---------- Two-column grid ---------- */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
            gap: 3,
            pb: 6,
          }}
        >
          {/* ======== LEFT COLUMN ======== */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* --- Stats row --- */}
            {analyticsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(5, 1fr)',
                  },
                  gap: 2,
                }}
              >
                {/* Card: Published */}
                <Box sx={cardSx}>
                  <Typography sx={monoLabel}>Published</Typography>
                  <Typography
                    sx={{
                      fontFamily: fraunces,
                      fontSize: 34,
                      letterSpacing: -1,
                      lineHeight: 1.1,
                      mt: 0.75,
                    }}
                  >
                    {summary?.totalPosts ?? 0}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'primary.main', mt: 0.5 }}>
                    +14 % this period
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                    total posts
                  </Typography>
                </Box>

                {/* Card: Success Rate */}
                <Box sx={cardSx}>
                  <Typography sx={monoLabel}>Success Rate</Typography>
                  <Typography
                    sx={{
                      fontFamily: fraunces,
                      fontSize: 34,
                      letterSpacing: -1,
                      lineHeight: 1.1,
                      mt: 0.75,
                    }}
                  >
                    {summary?.successRate ?? 0}%
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.75 }}>
                    delivery accuracy
                  </Typography>
                </Box>

                {/* Card: Failed */}
                <Box sx={cardSx}>
                  <Typography sx={monoLabel}>Failed</Typography>
                  <Typography
                    sx={{
                      fontFamily: fraunces,
                      fontSize: 34,
                      letterSpacing: -1,
                      lineHeight: 1.1,
                      mt: 0.75,
                    }}
                  >
                    {summary?.failedCount ?? 0}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.75 }}>
                    need attention
                  </Typography>
                </Box>

                {/* Card: Most Used */}
                <Box sx={cardSx}>
                  <Typography sx={monoLabel}>Most Used</Typography>
                  <Typography
                    sx={{
                      fontFamily: fraunces,
                      fontSize: 34,
                      letterSpacing: -1,
                      lineHeight: 1.1,
                      mt: 0.75,
                      textTransform: 'capitalize',
                    }}
                  >
                    {summary?.mostUsedPlatform ?? '---'}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.75 }}>
                    top platform
                  </Typography>
                </Box>

                {/* Card: Busiest Day */}
                <Box sx={cardSx}>
                  <Typography sx={monoLabel}>Busiest Day</Typography>
                  <Typography
                    sx={{
                      fontFamily: fraunces,
                      fontSize: 34,
                      letterSpacing: -1,
                      lineHeight: 1.1,
                      mt: 0.75,
                    }}
                  >
                    {summary?.busiestDay ?? '---'}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.75 }}>
                    highest volume
                  </Typography>
                </Box>
              </Box>
            )}

            {/* --- Publishing rhythm --- */}
            <Box sx={cardSx}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: { xs: 'flex-start', sm: 'space-between' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  mb: 2.5,
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography
                    sx={{ fontFamily: fraunces, fontSize: 22, letterSpacing: '-0.02em' }}
                  >
                    Publishing rhythm
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                    Posts per day &middot; last {visibleBars} days
                  </Typography>
                </Box>

                {/* Range selector pills */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {(['7d', '30d', '90d'] as TimeRange[]).map((r) => (
                    <Chip
                      key={r}
                      label={r}
                      size="small"
                      onClick={() => setAnalyticsRange(r)}
                      sx={{
                        height: 24,
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 2,
                        ...(analyticsRange === r
                          ? { bgcolor: 'primary.main', color: 'primary.contrastText' }
                          : { bgcolor: 'action.hover' }),
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Bar chart */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '4px',
                  height: 120,
                  mt: 1,
                }}
              >
                {displayValues.map((v, i) => {
                  const heightPct = maxChartVal > 0 ? (v / maxChartVal) * 100 : 0;
                  const isAccent = v === maxChartVal && v > 0;
                  return (
                    <Box
                      key={i}
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          maxWidth: 32,
                          minHeight: 4,
                          height: `${Math.max(heightPct, 3)}%`,
                          bgcolor: isAccent ? 'primary.main' : 'primary.light',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                          opacity: isAccent ? 1 : 0.55,
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
              {/* Day labels */}
              <Box sx={{ display: 'flex', gap: '4px', mt: 0.75 }}>
                {displayLabels.map((label, i) => {
                  const dayLetter = label.slice(0, 2);
                  return (
                    <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography
                        sx={{
                          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                          fontSize: 9,
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                        }}
                      >
                        {dayLetter}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* --- Connected accounts (with AI prompt selector) --- */}
            <Box sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontFamily: fraunces, fontSize: 22, letterSpacing: '-0.02em' }}>
                  Connected accounts
                </Typography>
              </Box>

              <ConnectButtons
                onFacebookConnect={handleFacebookConnect}
                onTwitterConnect={handleTwitterConnect}
                onTelegramConnect={() => setTelegramDialogOpen(true)}
                facebookLoading={fbConnecting}
                twitterLoading={twitterConnecting}
              />

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <AccountsTable
                  title=""
                  data={allAccounts}
                  emptyMessage="No accounts connected yet. Use the buttons above to connect your social media accounts."
                  loadingId={deletingId}
                  onDelete={promptDelete}
                  showPromptSelector={true}
                />
              )}
            </Box>

          </Box>

          {/* ======== RIGHT COLUMN ======== */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* --- Highlight card --- */}
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 4,
                p: 2.5,
              }}
            >
              <Typography sx={{ ...monoLabel, color: 'inherit', opacity: 0.7 }}>
                Highlight &middot; Week {getISOWeek(new Date())}
              </Typography>
              <Typography
                sx={{
                  fontFamily: fraunces,
                  fontSize: { xs: 32, sm: 40, md: 48 },
                  letterSpacing: -1.5,
                  lineHeight: 1.1,
                  mt: 1,
                }}
              >
                {summary ? formatCompact(summary.totalPosts) : '---'}
              </Typography>
              <Typography sx={{ fontSize: 13, mt: 0.5, opacity: 0.85 }}>
                total posts delivered across all connected platforms this period.
              </Typography>
              <Box
                sx={{
                  mt: 2,
                  bgcolor: 'rgba(255,255,255,0.12)',
                  borderRadius: 2.5,
                  p: 1.75,
                }}
              >
                <Typography sx={{ fontSize: 12, fontStyle: 'italic', lineHeight: 1.55 }}>
                  &ldquo;Consistency beats volume. Publishing steadily builds audience trust
                  faster than sporadic bursts of content.&rdquo;
                </Typography>
              </Box>
            </Box>

            {/* --- Suggestions card --- */}
            <Box sx={cardSx}>
              <Typography
                sx={{
                  fontFamily: fraunces,
                  fontSize: 20,
                  letterSpacing: '-0.02em',
                  mb: 1.5,
                }}
              >
                Suggestions
              </Typography>
              {SUGGESTIONS.map((tip, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    gap: 1.25,
                    py: 1,
                    borderTop: i === 0 ? 'none' : '1px solid',
                    borderColor: 'divider',
                    alignItems: 'flex-start',
                  }}
                >
                  <SparkleIcon
                    sx={{ fontSize: 16, color: 'primary.main', mt: 0.25, flexShrink: 0 }}
                  />
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
                    {tip}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>

      {/* ---------- Dialogs ---------- */}
      <ConfirmDisconnectDialog
        open={confirmDialog.open}
        account={confirmDialog.account}
        onClose={() => setConfirmDialog({ open: false, account: null })}
        onConfirm={confirmDelete}
      />

      <TelegramConnectDialog
        open={telegramDialogOpen}
        onClose={() => setTelegramDialogOpen(false)}
        onSuccess={handleTelegramSuccess}
      />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Utility functions                                                  */
/* ------------------------------------------------------------------ */

/** ISO week number */
function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Format a number with compact notation (1200 -> "1.2k") */
function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
