# AI Content Transformation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable AI-powered content transformation by configuring providers, linking prompts to providers, and assigning prompts to publishing destinations.

**Architecture:** Multi-provider OpenAI-compatible API system. Prompts are linked to providers, and destination accounts are linked to prompts. During publishing, content is transformed via the linked provider's API before posting.

**Tech Stack:** Next.js 15, React 19, MUI v7, PostgreSQL, OpenAI-compatible APIs

---

## Task 1: Create AI Providers Database Table

**Files:**
- Create: `migrations/012_create_ai_providers_table.sql`

**Step 1: Create the migration file**

```sql
-- Migration: Create ai_providers table
-- Replaces openai_api_keys with a multi-provider system

CREATE TABLE ai_providers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    api_key TEXT NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    model VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_providers_user_id ON ai_providers(user_id);

CREATE TRIGGER set_ai_providers_updated_at
BEFORE UPDATE ON ai_providers
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();

-- Migrate existing OpenAI keys to new table
INSERT INTO ai_providers (user_id, name, api_key, base_url, model, created_at, updated_at)
SELECT
    user_id,
    'OpenAI (migrated)',
    api_key,
    'https://api.openai.com/v1',
    'gpt-4o',
    created_at,
    updated_at
FROM openai_api_keys;
```

**Step 2: Run the migration**

```bash
psql $DATABASE_URL -f migrations/012_create_ai_providers_table.sql
```

**Step 3: Commit**

```bash
git add migrations/012_create_ai_providers_table.sql
git commit -m "feat(db): add ai_providers table with migration from openai_api_keys"
```

---

## Task 2: Add provider_id Column to ai_prompts Table

**Files:**
- Create: `migrations/013_add_provider_id_to_ai_prompts.sql`

**Step 1: Create the migration file**

```sql
-- Migration: Add provider_id to ai_prompts table
-- Links prompts to specific AI providers

ALTER TABLE ai_prompts
ADD COLUMN provider_id INTEGER REFERENCES ai_providers(id) ON DELETE SET NULL;

CREATE INDEX idx_ai_prompts_provider_id ON ai_prompts(provider_id);
```

**Step 2: Run the migration**

```bash
psql $DATABASE_URL -f migrations/013_add_provider_id_to_ai_prompts.sql
```

**Step 3: Commit**

```bash
git add migrations/013_add_provider_id_to_ai_prompts.sql
git commit -m "feat(db): add provider_id column to ai_prompts table"
```

---

## Task 3: Create Instagram and Telegram Prompt Matching Tables

**Files:**
- Create: `migrations/014_create_ai_prompts_instagram_matching.sql`
- Create: `migrations/015_create_ai_prompts_telegram_matching.sql`

**Step 1: Create Instagram matching migration**

```sql
-- Migration: Create ai_prompts_instagram_matching table
-- Links Instagram accounts to AI prompts for content transformation

CREATE TABLE ai_prompts_instagram_matching (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_account_id INTEGER NOT NULL REFERENCES connected_instagram_accounts(id) ON DELETE CASCADE,
    prompt_id INTEGER NOT NULL REFERENCES ai_prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, instagram_account_id)
);

CREATE INDEX idx_ai_prompts_instagram_user ON ai_prompts_instagram_matching(user_id);
CREATE INDEX idx_ai_prompts_instagram_account ON ai_prompts_instagram_matching(instagram_account_id);
```

**Step 2: Create Telegram matching migration**

```sql
-- Migration: Create ai_prompts_telegram_matching table
-- Links Telegram channels to AI prompts for content transformation

CREATE TABLE ai_prompts_telegram_matching (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_channel_id INTEGER NOT NULL REFERENCES connected_telegram_channels(id) ON DELETE CASCADE,
    prompt_id INTEGER NOT NULL REFERENCES ai_prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, telegram_channel_id)
);

CREATE INDEX idx_ai_prompts_telegram_user ON ai_prompts_telegram_matching(user_id);
CREATE INDEX idx_ai_prompts_telegram_channel ON ai_prompts_telegram_matching(telegram_channel_id);
```

**Step 3: Run the migrations**

```bash
psql $DATABASE_URL -f migrations/014_create_ai_prompts_instagram_matching.sql
psql $DATABASE_URL -f migrations/015_create_ai_prompts_telegram_matching.sql
```

**Step 4: Commit**

```bash
git add migrations/014_create_ai_prompts_instagram_matching.sql migrations/015_create_ai_prompts_telegram_matching.sql
git commit -m "feat(db): add Instagram and Telegram prompt matching tables"
```

---

## Task 4: Create AI Provider Types

**Files:**
- Create: `src/types/ai.ts`

**Step 1: Create the types file**

```typescript
// AI Provider and Prompt types

export interface AiProvider {
  id: number;
  name: string;
  base_url: string;
  model: string;
  created_at: string;
  updated_at: string;
  // api_key intentionally omitted for security - never sent to client
}

export interface AiProviderInput {
  name: string;
  api_key: string;
  base_url: string;
  model: string;
}

export interface AiPrompt {
  id: number;
  title: string;
  prompt: string;
  provider_id: number | null;
  provider_name?: string | null;
  created_at: string;
}

export interface AiPromptInput {
  title: string;
  prompt: string;
  provider_id?: number | null;
}

export interface PromptMatching {
  account_id: string | number;
  prompt_id: number | null;
  prompt_title?: string;
  provider_name?: string;
}

// Common base URLs for preset dropdown
export const COMMON_BASE_URLS = [
  { label: 'OpenAI', value: 'https://api.openai.com/v1' },
  { label: 'Anthropic (Claude)', value: 'https://api.anthropic.com/v1' },
  { label: 'Google (Gemini)', value: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { label: 'Ollama (local)', value: 'http://localhost:11434/v1' },
  { label: 'Custom', value: '' },
];
```

**Step 2: Commit**

```bash
git add src/types/ai.ts
git commit -m "feat(types): add AI provider and prompt types"
```

---

## Task 5: Create AI Providers API Endpoint

**Files:**
- Create: `src/app/api/ai/providers/route.ts`

**Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const getUserId = (req: NextRequest): number | null => {
  const userId = req.headers.get('x-user-id');
  const parsedUserId = userId ? parseInt(userId, 10) : null;
  return parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;
};

// GET: List all providers for user (without api_key)
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const client = await pool.connect();
    const { rows } = await client.query(
      `SELECT id, name, base_url, model, created_at, updated_at
       FROM ai_providers
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    client.release();

    return NextResponse.json({ success: true, providers: rows });
  } catch (error) {
    console.error('API Error (GET /ai/providers):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new provider
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { name, api_key, base_url, model } = await req.json();

    if (!name || !api_key || !base_url || !model) {
      return NextResponse.json({ error: 'All fields are required: name, api_key, base_url, model' }, { status: 400 });
    }

    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO ai_providers (user_id, name, api_key, base_url, model)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, base_url, model, created_at, updated_at`,
      [userId, name, api_key, base_url, model]
    );
    client.release();

    return NextResponse.json({ success: true, provider: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('API Error (POST /ai/providers):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update an existing provider
export async function PUT(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { id, name, api_key, base_url, model } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const client = await pool.connect();

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (api_key) {
      updates.push(`api_key = $${paramIndex++}`);
      values.push(api_key);
    }
    if (base_url) {
      updates.push(`base_url = $${paramIndex++}`);
      values.push(base_url);
    }
    if (model) {
      updates.push(`model = $${paramIndex++}`);
      values.push(model);
    }

    if (updates.length === 0) {
      client.release();
      return NextResponse.json({ error: 'At least one field to update is required' }, { status: 400 });
    }

    values.push(id, userId);
    const result = await client.query(
      `UPDATE ai_providers
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING id, name, base_url, model, created_at, updated_at`,
      values
    );
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Provider not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, provider: result.rows[0] });
  } catch (error) {
    console.error('API Error (PUT /ai/providers):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a provider
export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    const result = await client.query(
      'DELETE FROM ai_providers WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Provider not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('API Error (DELETE /ai/providers):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

**Step 2: Verify the API works**

```bash
npm run dev
# Test with curl or browser: GET /api/ai/providers
```

**Step 3: Commit**

```bash
git add src/app/api/ai/providers/route.ts
git commit -m "feat(api): add AI providers CRUD endpoint"
```

---

## Task 6: Update AI Prompts API to Include provider_id

**Files:**
- Modify: `src/app/api/ai/prompts/route.ts`

**Step 1: Update the GET query to include provider info**

In the GET function, change the query from:
```typescript
query = 'SELECT id, title, prompt, created_at FROM ai_prompts WHERE user_id = $1 ORDER BY created_at DESC';
```

To:
```typescript
query = `SELECT p.id, p.title, p.prompt, p.provider_id, p.created_at, pr.name as provider_name
         FROM ai_prompts p
         LEFT JOIN ai_providers pr ON p.provider_id = pr.id
         WHERE p.user_id = $1
         ORDER BY p.created_at DESC`;
```

And for single prompt query:
```typescript
query = `SELECT p.id, p.title, p.prompt, p.provider_id, p.created_at, pr.name as provider_name
         FROM ai_prompts p
         LEFT JOIN ai_providers pr ON p.provider_id = pr.id
         WHERE p.id = $1 AND p.user_id = $2`;
```

**Step 2: Update POST to accept provider_id**

Change the POST destructuring from:
```typescript
const { title, prompt } = await req.json();
```

To:
```typescript
const { title, prompt, provider_id } = await req.json();
```

And update the INSERT query:
```typescript
const result = await client.query(
  `INSERT INTO ai_prompts (user_id, title, prompt, provider_id)
   VALUES ($1, $2, $3, $4)
   RETURNING id, title, prompt, provider_id, created_at`,
  [userId, title, prompt, provider_id || null]
);
```

**Step 3: Update PUT to accept provider_id**

Change the PUT destructuring:
```typescript
const { id, title, prompt, provider_id } = await req.json();
```

And update the UPDATE query:
```typescript
const result = await client.query(
  `UPDATE ai_prompts
   SET title = COALESCE($1, title), prompt = COALESCE($2, prompt), provider_id = $3
   WHERE id = $4 AND user_id = $5
   RETURNING id`,
  [title, prompt, provider_id !== undefined ? provider_id : null, id, userId]
);
```

**Step 4: Commit**

```bash
git add src/app/api/ai/prompts/route.ts
git commit -m "feat(api): update prompts API to support provider_id"
```

---

## Task 7: Create Prompt Matching API Endpoint

**Files:**
- Create: `src/app/api/ai/prompt-matching/[platform]/route.ts`

**Step 1: Create the dynamic route API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

type Platform = 'facebook' | 'twitter' | 'instagram' | 'telegram';

const PLATFORM_CONFIG: Record<Platform, { table: string; accountIdColumn: string; accountTable: string; accountIdField: string }> = {
  facebook: {
    table: 'ai_prompts_facebook_matching',
    accountIdColumn: 'page_id',
    accountTable: 'connected_facebook_pages',
    accountIdField: 'id',
  },
  twitter: {
    table: 'ai_prompts_x_matching',
    accountIdColumn: 'x_account_id',
    accountTable: 'connected_x_accounts',
    accountIdField: 'id',
  },
  instagram: {
    table: 'ai_prompts_instagram_matching',
    accountIdColumn: 'instagram_account_id',
    accountTable: 'connected_instagram_accounts',
    accountIdField: 'id',
  },
  telegram: {
    table: 'ai_prompts_telegram_matching',
    accountIdColumn: 'telegram_channel_id',
    accountTable: 'connected_telegram_channels',
    accountIdField: 'id',
  },
};

const getUserId = (req: NextRequest): number | null => {
  const userId = req.headers.get('x-user-id');
  const parsedUserId = userId ? parseInt(userId, 10) : null;
  return parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;
};

// GET: Get all prompt matchings for a platform
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { platform } = await params;
  const config = PLATFORM_CONFIG[platform as Platform];

  if (!config) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    const { rows } = await client.query(
      `SELECT m.${config.accountIdColumn} as account_id, m.prompt_id, p.title as prompt_title, pr.name as provider_name
       FROM ${config.table} m
       LEFT JOIN ai_prompts p ON m.prompt_id = p.id
       LEFT JOIN ai_providers pr ON p.provider_id = pr.id
       WHERE m.user_id = $1`,
      [userId]
    );
    client.release();

    return NextResponse.json({ success: true, matchings: rows });
  } catch (error) {
    console.error(`API Error (GET /ai/prompt-matching/${platform}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Set/update a prompt matching for an account
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { platform } = await params;
  const config = PLATFORM_CONFIG[platform as Platform];

  if (!config) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  try {
    const { account_id, prompt_id } = await req.json();

    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    const client = await pool.connect();

    // Verify the account belongs to the user
    const accountCheck = await client.query(
      `SELECT ${config.accountIdField} FROM ${config.accountTable} WHERE ${config.accountIdField} = $1`,
      [account_id]
    );

    if (accountCheck.rowCount === 0) {
      client.release();
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Upsert the matching
    await client.query(
      `INSERT INTO ${config.table} (user_id, ${config.accountIdColumn}, prompt_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, ${config.accountIdColumn})
       DO UPDATE SET prompt_id = $3`,
      [userId, account_id, prompt_id]
    );
    client.release();

    return NextResponse.json({ success: true, message: 'Matching saved successfully' });
  } catch (error) {
    console.error(`API Error (POST /ai/prompt-matching/${platform}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a prompt matching
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { platform } = await params;
  const config = PLATFORM_CONFIG[platform as Platform];

  if (!config) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  try {
    const { account_id } = await req.json();

    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    const client = await pool.connect();
    await client.query(
      `DELETE FROM ${config.table} WHERE user_id = $1 AND ${config.accountIdColumn} = $2`,
      [userId, account_id]
    );
    client.release();

    return NextResponse.json({ success: true, message: 'Matching removed successfully' });
  } catch (error) {
    console.error(`API Error (DELETE /ai/prompt-matching/${platform}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/ai/prompt-matching/[platform]/route.ts
git commit -m "feat(api): add prompt matching API for all platforms"
```

---

## Task 8: Create useAiProviders Hook

**Files:**
- Create: `src/hooks/useAiProviders.ts`

**Step 1: Create the hook**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { AiProvider, AiProviderInput } from '@/types/ai';

export function useAiProviders() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/ai/providers');
      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const addProvider = async (input: AiProviderInput): Promise<boolean> => {
    try {
      const response = await fetchWithAuth('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add provider');
      }
      await fetchProviders();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const updateProvider = async (id: number, input: Partial<AiProviderInput>): Promise<boolean> => {
    try {
      const response = await fetchWithAuth('/api/ai/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...input }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update provider');
      }
      await fetchProviders();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const deleteProvider = async (id: number): Promise<boolean> => {
    try {
      const response = await fetchWithAuth('/api/ai/providers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete provider');
      }
      await fetchProviders();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  return {
    providers,
    loading,
    error,
    refetch: fetchProviders,
    addProvider,
    updateProvider,
    deleteProvider,
    clearError: () => setError(null),
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAiProviders.ts
git commit -m "feat(hooks): add useAiProviders hook"
```

---

## Task 9: Create usePromptMatching Hook

**Files:**
- Create: `src/hooks/usePromptMatching.ts`

**Step 1: Create the hook**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { PromptMatching } from '@/types/ai';

type Platform = 'facebook' | 'twitter' | 'instagram' | 'telegram';

export function usePromptMatching(platform: Platform) {
  const [matchings, setMatchings] = useState<PromptMatching[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatchings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/ai/prompt-matching/${platform}`);
      if (!response.ok) {
        throw new Error('Failed to fetch matchings');
      }
      const data = await response.json();
      setMatchings(data.matchings || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    fetchMatchings();
  }, [fetchMatchings]);

  const setMatching = async (accountId: string | number, promptId: number | null): Promise<boolean> => {
    try {
      const response = await fetchWithAuth(`/api/ai/prompt-matching/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, prompt_id: promptId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set matching');
      }
      await fetchMatchings();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const removeMatching = async (accountId: string | number): Promise<boolean> => {
    try {
      const response = await fetchWithAuth(`/api/ai/prompt-matching/${platform}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove matching');
      }
      await fetchMatchings();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const getMatchingForAccount = (accountId: string | number): PromptMatching | undefined => {
    return matchings.find((m) => String(m.account_id) === String(accountId));
  };

  return {
    matchings,
    loading,
    error,
    refetch: fetchMatchings,
    setMatching,
    removeMatching,
    getMatchingForAccount,
    clearError: () => setError(null),
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/usePromptMatching.ts
git commit -m "feat(hooks): add usePromptMatching hook"
```

---

## Task 10: Create AI Hub Page

**Files:**
- Modify: `src/app/ai/page.tsx`

**Step 1: Replace the redirect with a hub page**

```typescript
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  useTheme,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const cards = [
  {
    href: '/ai/providers',
    icon: SettingsIcon,
    title: 'AI Providers',
    description: 'Configure your AI providers (OpenAI, Claude, Gemini, or any OpenAI-compatible API)',
  },
  {
    href: '/ai/prompts',
    icon: ChatIcon,
    title: 'Prompts',
    description: 'Create and manage prompts for content transformation',
  },
];

export default function AiPage() {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontWeight: theme.typography.fontWeightBold, mb: 1 }}
      >
        AI Tools
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure AI providers and prompts to automatically transform your content before publishing.
      </Typography>

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid size={{ xs: 12, md: 6 }} key={card.href}>
            <Paper
              component={Link}
              href={card.href}
              elevation={0}
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#E1306C',
                  bgcolor: '#E1306C08',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(225,48,108,0.12)',
                },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: '#E1306C15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <card.icon sx={{ fontSize: 28, color: '#E1306C' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#E1306C', mt: 'auto' }}>
                <Typography variant="body2" fontWeight={500}>
                  Configure
                </Typography>
                <ArrowForwardIcon sx={{ fontSize: 18 }} />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/ai/page.tsx
git commit -m "feat(ui): create AI hub page with provider and prompt cards"
```

---

## Task 11: Create AI Providers Page

**Files:**
- Create: `src/app/ai/providers/page.tsx`

**Step 1: Create the providers management page**

```typescript
'use client';

import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  AlertTitle,
  useTheme,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useAiProviders } from '@/hooks/useAiProviders';
import { COMMON_BASE_URLS } from '@/types/ai';
import type { AiProvider } from '@/types/ai';

export default function AiProvidersPage() {
  const theme = useTheme();
  const { providers, loading, error, addProvider, updateProvider, deleteProvider, clearError } = useAiProviders();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [formData, setFormData] = useState({ name: '', api_key: '', base_url: '', model: '' });
  const [baseUrlPreset, setBaseUrlPreset] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; provider: AiProvider | null }>({ open: false, provider: null });

  const handleOpenDialog = (provider?: AiProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData({ name: provider.name, api_key: '', base_url: provider.base_url, model: provider.model });
      const preset = COMMON_BASE_URLS.find((p) => p.value === provider.base_url);
      setBaseUrlPreset(preset ? preset.value : '');
    } else {
      setEditingProvider(null);
      setFormData({ name: '', api_key: '', base_url: '', model: '' });
      setBaseUrlPreset('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProvider(null);
    clearError();
  };

  const handlePresetChange = (value: string) => {
    setBaseUrlPreset(value);
    if (value) {
      setFormData((prev) => ({ ...prev, base_url: value }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    let success: boolean;

    if (editingProvider) {
      const updates: Record<string, string> = {};
      if (formData.name !== editingProvider.name) updates.name = formData.name;
      if (formData.api_key) updates.api_key = formData.api_key;
      if (formData.base_url !== editingProvider.base_url) updates.base_url = formData.base_url;
      if (formData.model !== editingProvider.model) updates.model = formData.model;
      success = await updateProvider(editingProvider.id, updates);
    } else {
      success = await addProvider(formData);
    }

    setIsSaving(false);
    if (success) {
      handleCloseDialog();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.provider) return;
    await deleteProvider(confirmDelete.provider.id);
    setConfirmDelete({ open: false, provider: null });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: theme.typography.fontWeightBold, mb: 3 }}>
        AI Providers
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Configure AI providers to power your content transformations. Supports any OpenAI-compatible API including OpenAI, Claude, Gemini, and local models like Ollama.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 4 }}>
        <Button variant="contained" color="primary" onClick={() => handleOpenDialog()} startIcon={<AddIcon />} sx={{ textTransform: 'none' }}>
          Add Provider
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Your AI Providers
        </Typography>
        {providers.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            No providers configured yet. Click &quot;Add Provider&quot; to get started.
          </Typography>
        ) : (
          <List>
            {providers.map((provider) => (
              <Box key={provider.id}>
                <ListItem
                  secondaryAction={
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton edge="end" onClick={() => handleOpenDialog(provider)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton edge="end" onClick={() => setConfirmDelete({ open: true, provider })}>
                          <DeleteIcon color="error" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {provider.name}
                        </Typography>
                        <Chip label={provider.model} size="small" variant="outlined" />
                      </Box>
                    }
                    secondary={provider.base_url}
                  />
                </ListItem>
                <Divider component="li" />
              </Box>
            ))}
          </List>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add New Provider'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editingProvider ? 'Update the provider configuration. Leave API key blank to keep existing.' : 'Enter the details for your AI provider.'}
          </DialogContentText>
          <TextField
            autoFocus
            label="Provider Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="e.g., My OpenAI, Claude Sonnet"
          />
          <TextField
            label={editingProvider ? 'API Key (leave blank to keep existing)' : 'API Key'}
            type="password"
            fullWidth
            variant="outlined"
            value={formData.api_key}
            onChange={(e) => setFormData((prev) => ({ ...prev, api_key: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Base URL Preset</InputLabel>
            <Select value={baseUrlPreset} label="Base URL Preset" onChange={(e) => handlePresetChange(e.target.value)}>
              {COMMON_BASE_URLS.map((preset) => (
                <MenuItem key={preset.label} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Base URL"
            fullWidth
            variant="outlined"
            value={formData.base_url}
            onChange={(e) => setFormData((prev) => ({ ...prev, base_url: e.target.value }))}
            sx={{ mb: 2 }}
            placeholder="https://api.openai.com/v1"
          />
          <TextField
            label="Model"
            fullWidth
            variant="outlined"
            value={formData.model}
            onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
            placeholder="e.g., gpt-4o, claude-3-sonnet-20240229"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaving || !formData.name || (!editingProvider && !formData.api_key) || !formData.base_url || !formData.model}
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, provider: null })}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{confirmDelete.provider?.name}&quot;? Prompts using this provider will become inactive.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete({ open: false, provider: null })}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/ai/providers/page.tsx
git commit -m "feat(ui): create AI providers management page"
```

---

## Task 12: Update Prompts Page with Provider Selection

**Files:**
- Modify: `src/app/ai/prompts/page.tsx`

**Step 1: Add provider selection to the prompts page**

Update imports to add:
```typescript
import { useAiProviders } from '@/hooks/useAiProviders';
import type { AiPrompt } from '@/types/ai';
```

Add provider hook after existing hooks:
```typescript
const { providers } = useAiProviders();
```

Update the `AiPrompt` interface at the top to add:
```typescript
interface AiPrompt {
  id: number;
  title: string;
  prompt: string;
  provider_id: number | null;
  provider_name?: string | null;
  created_at: string;
}
```

Add state for provider selection:
```typescript
const [newPromptProviderId, setNewPromptProviderId] = useState<number | null>(null);
const [editedProviderId, setEditedProviderId] = useState<number | null>(null);
```

In `handleOpenAddDialog`, reset provider:
```typescript
setNewPromptProviderId(null);
```

In `handleEditClick`, set provider:
```typescript
setEditedProviderId(prompt.provider_id);
```

Update `handleAddPrompt` to include provider_id:
```typescript
body: JSON.stringify({ title: newPromptTitle, prompt: newPromptContent, provider_id: newPromptProviderId }),
```

Update `handleSaveEdit` to include provider_id:
```typescript
body: JSON.stringify({ id: editingPromptId, title: editedTitle, prompt: editedPrompt, provider_id: editedProviderId }),
```

Add provider dropdown in the Add Dialog (after prompt TextField):
```typescript
<FormControl fullWidth sx={{ mt: 2 }}>
  <InputLabel>AI Provider</InputLabel>
  <Select
    value={newPromptProviderId || ''}
    label="AI Provider"
    onChange={(e) => setNewPromptProviderId(e.target.value ? Number(e.target.value) : null)}
  >
    <MenuItem value="">None (Template only)</MenuItem>
    {providers.map((p) => (
      <MenuItem key={p.id} value={p.id}>
        {p.name} ({p.model})
      </MenuItem>
    ))}
  </Select>
</FormControl>
```

Add provider dropdown in the Edit section (after edit TextField):
```typescript
<FormControl fullWidth sx={{ mb: 2 }}>
  <InputLabel>AI Provider</InputLabel>
  <Select
    value={editedProviderId || ''}
    label="AI Provider"
    onChange={(e) => setEditedProviderId(e.target.value ? Number(e.target.value) : null)}
  >
    <MenuItem value="">None (Template only)</MenuItem>
    {providers.map((p) => (
      <MenuItem key={p.id} value={p.id}>
        {p.name} ({p.model})
      </MenuItem>
    ))}
  </Select>
</FormControl>
```

Update the prompt list to show provider badge:
```typescript
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <Typography variant="subtitle1" fontWeight="bold">
    {prompt.title}
  </Typography>
  {prompt.provider_name ? (
    <Chip label={prompt.provider_name} size="small" color="primary" variant="outlined" />
  ) : (
    <Chip label="No provider" size="small" color="warning" variant="outlined" />
  )}
</Box>
```

Add warning message if no providers exist (before "Add Prompt" button):
```typescript
{providers.length === 0 && (
  <Alert severity="info" sx={{ mb: 3 }}>
    <AlertTitle>No AI Providers</AlertTitle>
    Add an AI provider first to enable content transformation. <Link href="/ai/providers">Configure providers</Link>
  </Alert>
)}
```

**Step 2: Commit**

```bash
git add src/app/ai/prompts/page.tsx
git commit -m "feat(ui): add provider selection to prompts page"
```

---

## Task 13: Create PromptSelector Component

**Files:**
- Create: `src/components/ai/PromptSelector.tsx`

**Step 1: Create the component**

```typescript
'use client';

import React from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { AiPrompt } from '@/types/ai';

interface PromptSelectorProps {
  prompts: AiPrompt[];
  selectedPromptId: number | null;
  onChange: (promptId: number | null) => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export function PromptSelector({
  prompts,
  selectedPromptId,
  onChange,
  loading = false,
  disabled = false,
  size = 'small',
}: PromptSelectorProps) {
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  if (loading) {
    return <CircularProgress size={20} />;
  }

  return (
    <FormControl size={size} sx={{ minWidth: 180 }} disabled={disabled}>
      <InputLabel>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AutoAwesomeIcon sx={{ fontSize: 16 }} />
          AI Prompt
        </Box>
      </InputLabel>
      <Select
        value={selectedPromptId || ''}
        label="AI Prompt"
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        renderValue={() => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedPrompt ? (
              <>
                <Typography variant="body2">{selectedPrompt.title}</Typography>
                {selectedPrompt.provider_name && (
                  <Chip label={selectedPrompt.provider_name} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                None
              </Typography>
            )}
          </Box>
        )}
      >
        <MenuItem value="">
          <Typography color="text.secondary">None (no transformation)</Typography>
        </MenuItem>
        {prompts.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No prompts available
            </Typography>
          </MenuItem>
        ) : (
          prompts.map((prompt) => (
            <MenuItem key={prompt.id} value={prompt.id} disabled={!prompt.provider_id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2">{prompt.title}</Typography>
                {prompt.provider_name ? (
                  <Chip label={prompt.provider_name} size="small" sx={{ ml: 'auto', height: 18, fontSize: '0.65rem' }} />
                ) : (
                  <Chip label="No provider" size="small" color="warning" sx={{ ml: 'auto', height: 18, fontSize: '0.65rem' }} />
                )}
              </Box>
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
}
```

**Step 2: Create barrel export**

Create `src/components/ai/index.ts`:

```typescript
export { PromptSelector } from './PromptSelector';
```

**Step 3: Commit**

```bash
git add src/components/ai/PromptSelector.tsx src/components/ai/index.ts
git commit -m "feat(ui): create PromptSelector component"
```

---

## Task 14: Create useAiPrompts Hook

**Files:**
- Create: `src/hooks/useAiPrompts.ts`

**Step 1: Create the hook**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetch';
import type { AiPrompt } from '@/types/ai';

export function useAiPrompts() {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/api/ai/prompts');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  return {
    prompts,
    loading,
    error,
    refetch: fetchPrompts,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAiPrompts.ts
git commit -m "feat(hooks): add useAiPrompts hook"
```

---

## Task 15: Update AccountsTable to Show AI Badge and Prompt Selector

**Files:**
- Modify: `src/components/dashboard/AccountsTable.tsx`

**Step 1: Add AI prompt selector to each account row**

Update imports:
```typescript
import { useAiPrompts } from '@/hooks/useAiPrompts';
import { usePromptMatching } from '@/hooks/usePromptMatching';
import { PromptSelector } from '@/components/ai';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
```

Update the component to accept platform-specific matching:
```typescript
interface AccountsTableProps {
  title: string;
  data: AccountData[];
  emptyMessage: string;
  loadingId: string | null;
  onDelete: (account: AccountData) => void;
  showPromptSelector?: boolean;
}
```

Add prompts hook and matching hooks inside the component:
```typescript
const { prompts, loading: promptsLoading } = useAiPrompts();
const facebookMatching = usePromptMatching('facebook');
const twitterMatching = usePromptMatching('twitter');
const instagramMatching = usePromptMatching('instagram');
const telegramMatching = usePromptMatching('telegram');

const getMatchingHook = (platform: Platform) => {
  switch (platform) {
    case 'facebook': return facebookMatching;
    case 'twitter': return twitterMatching;
    case 'instagram': return instagramMatching;
    case 'telegram': return telegramMatching;
  }
};
```

Add AI Prompt column header after Name:
```typescript
<TableCell sx={{ fontWeight: 'bold', width: 200 }}>AI Prompt</TableCell>
```

Add AI Prompt cell in each row after Name cell:
```typescript
<TableCell>
  {showPromptSelector && (
    <PromptSelector
      prompts={prompts}
      selectedPromptId={getMatchingHook(account.platform).getMatchingForAccount(account.id)?.prompt_id || null}
      onChange={(promptId) => getMatchingHook(account.platform).setMatching(account.id, promptId)}
      loading={promptsLoading}
      size="small"
    />
  )}
</TableCell>
```

**Step 2: Update DashboardPage to pass showPromptSelector**

In `src/app/dashboard/page.tsx`, add `showPromptSelector={true}` to the AccountsTable:
```typescript
<AccountsTable
  title="Connected Accounts"
  data={[...]}
  emptyMessage="..."
  loadingId={deletingId}
  onDelete={promptDelete}
  showPromptSelector={true}
/>
```

**Step 3: Commit**

```bash
git add src/components/dashboard/AccountsTable.tsx src/app/dashboard/page.tsx
git commit -m "feat(ui): add AI prompt selector to accounts table"
```

---

## Task 16: Update Navbar with New AI Menu Structure

**Files:**
- Modify: `src/components/Navbar.tsx`

**Step 1: Update the AI Tools children**

Change the AI Tools children from:
```typescript
{
  label: 'AI Tools',
  icon: AutoAwesomeIcon,
  children: [
    { href: '/ai/openai-config', label: 'OpenAI Config', icon: SettingsIcon },
    { href: '/ai/prompts', label: 'AI Prompts', icon: ChatIcon },
  ],
},
```

To:
```typescript
{
  label: 'AI Tools',
  icon: AutoAwesomeIcon,
  children: [
    { href: '/ai/providers', label: 'Providers', icon: SettingsIcon },
    { href: '/ai/prompts', label: 'Prompts', icon: ChatIcon },
  ],
},
```

**Step 2: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat(ui): update navbar AI menu with providers link"
```

---

## Task 17: Create AI Transform Service

**Files:**
- Create: `src/lib/ai/transformService.ts`

**Step 1: Create the transform service**

```typescript
import pool from '@/lib/db';

interface TransformResult {
  success: boolean;
  content?: string;
  error?: string;
}

interface ProviderConfig {
  api_key: string;
  base_url: string;
  model: string;
}

interface PromptConfig {
  id: number;
  prompt: string;
  provider_id: number;
}

export async function getPromptForDestination(
  userId: number,
  platform: 'facebook' | 'twitter' | 'instagram' | 'telegram',
  accountId: string | number
): Promise<{ prompt: PromptConfig; provider: ProviderConfig } | null> {
  const tableMap = {
    facebook: { table: 'ai_prompts_facebook_matching', column: 'page_id' },
    twitter: { table: 'ai_prompts_x_matching', column: 'x_account_id' },
    instagram: { table: 'ai_prompts_instagram_matching', column: 'instagram_account_id' },
    telegram: { table: 'ai_prompts_telegram_matching', column: 'telegram_channel_id' },
  };

  const config = tableMap[platform];
  if (!config) return null;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT p.id, p.prompt, p.provider_id, pr.api_key, pr.base_url, pr.model
       FROM ${config.table} m
       JOIN ai_prompts p ON m.prompt_id = p.id
       JOIN ai_providers pr ON p.provider_id = pr.id
       WHERE m.user_id = $1 AND m.${config.column} = $2 AND p.provider_id IS NOT NULL`,
      [userId, accountId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      prompt: { id: row.id, prompt: row.prompt, provider_id: row.provider_id },
      provider: { api_key: row.api_key, base_url: row.base_url, model: row.model },
    };
  } finally {
    client.release();
  }
}

export async function transformContent(
  content: string,
  promptText: string,
  provider: ProviderConfig
): Promise<TransformResult> {
  try {
    const response = await fetch(`${provider.base_url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.api_key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: promptText },
          { role: 'user', content: content },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const transformedContent = data.choices?.[0]?.message?.content;

    if (!transformedContent) {
      return { success: false, error: 'No content in API response' };
    }

    return { success: true, content: transformedContent.trim() };
  } catch (error) {
    return { success: false, error: `Transform failed: ${(error as Error).message}` };
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/ai/transformService.ts
git commit -m "feat(lib): create AI transform service"
```

---

## Task 18: Delete Old OpenAI Config Page

**Files:**
- Delete: `src/app/ai/openai-config/page.tsx`

**Step 1: Remove the old page**

```bash
rm src/app/ai/openai-config/page.tsx
rmdir src/app/ai/openai-config
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated openai-config page"
```

---

## Task 19: Build and Test

**Step 1: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 2: Start dev server and test**

```bash
npm run dev
```

Manual testing:
1. Navigate to `/ai` - should see hub page with two cards
2. Navigate to `/ai/providers` - should be able to add/edit/delete providers
3. Navigate to `/ai/prompts` - should see provider dropdown in add/edit dialogs
4. Navigate to `/dashboard` - should see AI Prompt dropdown for each account
5. Select a prompt for an account - should save without error

**Step 3: Commit any fixes**

If any fixes needed:
```bash
git add -A
git commit -m "fix: address build/test issues"
```

---

## Task 20: Final Commit and Summary

**Step 1: Verify all changes are committed**

```bash
git status
```

**Step 2: Create summary commit if needed**

If there are uncommitted changes:
```bash
git add -A
git commit -m "feat: complete AI content transformation foundation

- Add ai_providers table for multi-provider support
- Add provider_id to ai_prompts table
- Add Instagram and Telegram prompt matching tables
- Create providers CRUD API
- Create prompt matching API
- Create AI hub page with cards
- Create providers management page
- Update prompts page with provider selection
- Add prompt selector to accounts table
- Create transform service for API calls"
```

---

## Notes for Implementation

**Database migrations must be run in order:**
1. 012_create_ai_providers_table.sql
2. 013_add_provider_id_to_ai_prompts.sql
3. 014_create_ai_prompts_instagram_matching.sql
4. 015_create_ai_prompts_telegram_matching.sql

**The publish flow integration (Task 4 in design doc - Section 4) is NOT included in this plan.** That's a separate, larger task that involves modifying the streaming publish API and frontend publish page. This plan establishes the foundation (providers, prompts, matchings).

**Testing checklist:**
- [ ] Can add AI provider
- [ ] Can edit AI provider
- [ ] Can delete AI provider
- [ ] Can create prompt with provider
- [ ] Can edit prompt provider
- [ ] Can assign prompt to Facebook page
- [ ] Can assign prompt to X account
- [ ] Can assign prompt to Instagram account
- [ ] Can assign prompt to Telegram channel
- [ ] Prompts without providers show warning
- [ ] Deleted provider sets prompt.provider_id to NULL
