'use client';

import { Box, Container, Typography } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { McpTokenCard } from '@/components/dashboard/McpTokenCard';

const TOOLS = [
  ['get_connected_social_media_types', 'which platforms you have accounts connected for'],
  ['list_drafts / search_drafts', 'browse your drafts, paginated, optionally only the last N days'],
  ['add_draft / edit_draft / delete_draft', 'write and manage drafts: text, target platforms, media URLs'],
  ['get_publish_history', 'what was posted where and whether it succeeded, optionally only the last N days'],
];

export default function McpPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 0 } }}>
      <Container maxWidth="md">
        <PageHeader
          eyebrow="AI · MCP"
          title={<>MCP Access</>}
          lead="Connect an AI client like Claude to Mockingbird and let it write and manage your drafts."
        />

        <McpTokenCard />

        <Typography sx={{ mt: 4, mb: 1.5, fontWeight: 600 }}>Available tools</Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {TOOLS.map(([name, description]) => (
            <Typography component="li" key={name} sx={{ fontSize: 14, color: 'text.secondary' }}>
              <code>{name}</code> — {description}
            </Typography>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
