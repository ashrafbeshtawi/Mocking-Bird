# Telegram Integration Plan

## Overview

Integrate Telegram channel publishing using a **single app-managed bot**. Users add the bot as admin to their channels, then connect channels via the app.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mockingbird App                       │
├─────────────────────────────────────────────────────────┤
│  TELEGRAM_BOT_TOKEN (env variable - single bot)         │
│                         │                                │
│    ┌────────────────────┼────────────────────┐          │
│    ▼                    ▼                    ▼          │
│  User A's            User B's            User C's       │
│  Channel 1           Channel 1           Channel 1      │
│  Channel 2           Channel 2                          │
└─────────────────────────────────────────────────────────┘
```

**Key Points:**
- One bot token stored in `.env` (server-side only)
- Users only provide channel ID/username
- Bot must be admin in channel to post
- No sensitive tokens stored per user

---

## Phase 1: Environment Setup

### 1.1 Add Bot Token to Environment

**File:** `.env`
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

**File:** `.env.example`
```env
TELEGRAM_BOT_TOKEN=
```

---

## Phase 2: Database

### 2.1 Create Migration

**File:** `migrations/011_create_connected_telegram_channels.sql`

```sql
CREATE TABLE IF NOT EXISTS connected_telegram_channels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_title TEXT NOT NULL,
    channel_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

CREATE INDEX idx_telegram_channels_user_id ON connected_telegram_channels(user_id);
```

**Note:** No bot_token column - it's a single env variable.

---

## Phase 3: Type Definitions

### 3.1 Update `/src/types/accounts.ts`

```typescript
// Telegram channel for frontend display
export interface TelegramChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_username?: string;
}

// Token for publishing (channel info only, bot token from env)
export interface TelegramChannelToken {
  channel_id: string;
  channel_title: string;
  channel_username?: string;
}

// Add to API_CONFIG
export const API_CONFIG = {
  // ... existing
  TELEGRAM: {
    DELETE_CHANNEL: '/api/telegram/delete-channel',
  },
};
```

### 3.2 Update `/src/types/interfaces.ts`

Add to `SuccessfulPublishResult` and `FailedPublishResult`:
```typescript
telegram_channel_id?: string;
```

---

## Phase 4: Telegram Publisher

### 4.1 Create `/src/lib/publishers/telegram.ts`

```typescript
import { Pool } from 'pg';

export interface TelegramChannelToken {
  channel_id: string;
  channel_title: string;
  channel_username?: string;
}

export interface TelegramPublishOptions {
  text: string;
  mediaUrls?: string[];
  mediaTypes?: ('image' | 'video')[];
}

export interface TelegramPublishResult {
  platform: 'telegram';
  channel_id: string;
  channel_title: string;
  message_id: number;
  chat_id: string;
}

export interface TelegramPublishError {
  platform: 'telegram';
  channel_id: string;
  channel_title: string;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export class TelegramPublisher {
  private botToken: string;

  constructor(private pool: Pool) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
    }
    this.botToken = token;
  }

  async getChannelTokens(userId: string, channelIds: string[]): Promise<TelegramChannelToken[]> {
    if (channelIds.length === 0) return [];

    const placeholders = channelIds.map((_, i) => `$${i + 2}`).join(', ');
    const query = `
      SELECT channel_id, channel_title, channel_username
      FROM connected_telegram_channels
      WHERE user_id = $1 AND channel_id IN (${placeholders})
    `;

    const result = await this.pool.query(query, [userId, ...channelIds]);
    return result.rows;
  }

  validateMissingChannels(requested: string[], found: TelegramChannelToken[]): string[] {
    const foundIds = new Set(found.map(t => t.channel_id));
    return requested.filter(id => !foundIds.has(id));
  }

  async publishToChannels(
    options: TelegramPublishOptions,
    tokens: TelegramChannelToken[]
  ): Promise<{
    successful: TelegramPublishResult[];
    failed: TelegramPublishError[];
  }> {
    const successful: TelegramPublishResult[] = [];
    const failed: TelegramPublishError[] = [];

    for (const token of tokens) {
      try {
        const result = await this.sendMessage(token.channel_id, options);
        successful.push({
          platform: 'telegram',
          channel_id: token.channel_id,
          channel_title: token.channel_title,
          message_id: result.message_id,
          chat_id: result.chat.id.toString(),
        });
      } catch (error) {
        failed.push({
          platform: 'telegram',
          channel_id: token.channel_id,
          channel_title: token.channel_title,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error,
          },
        });
      }
    }

    return { successful, failed };
  }

  // Validate that bot is admin in channel
  async validateChannelAccess(channelId: string): Promise<{
    valid: boolean;
    channelTitle?: string;
    channelUsername?: string;
    error?: string;
  }> {
    const baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    try {
      // Get channel info
      const chatResponse = await fetch(`${baseUrl}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: channelId }),
      });

      const chatData = await chatResponse.json();
      if (!chatData.ok) {
        return { valid: false, error: chatData.description || 'Channel not found' };
      }

      const chat = chatData.result;
      if (chat.type !== 'channel') {
        return { valid: false, error: 'The provided ID is not a channel' };
      }

      // Check bot is admin
      const adminsResponse = await fetch(`${baseUrl}/getChatAdministrators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: channelId }),
      });

      const adminsData = await adminsResponse.json();
      if (!adminsData.ok) {
        return { valid: false, error: 'Could not verify bot admin status' };
      }

      // Get bot info to check if it's in admin list
      const meResponse = await fetch(`${baseUrl}/getMe`);
      const meData = await meResponse.json();
      if (!meData.ok) {
        return { valid: false, error: 'Could not verify bot identity' };
      }

      const botId = meData.result.id;
      const isAdmin = adminsData.result.some(
        (admin: { user: { id: number } }) => admin.user.id === botId
      );

      if (!isAdmin) {
        return {
          valid: false,
          error: 'Bot is not an admin in this channel. Please add the bot as an administrator.'
        };
      }

      return {
        valid: true,
        channelTitle: chat.title,
        channelUsername: chat.username,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate channel'
      };
    }
  }

  // Get bot username for display
  async getBotUsername(): Promise<string | null> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
      const data = await response.json();
      return data.ok ? data.result.username : null;
    } catch {
      return null;
    }
  }

  private async sendMessage(
    channelId: string,
    options: TelegramPublishOptions
  ): Promise<{ message_id: number; chat: { id: number } }> {
    const baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    // If we have media, send as photo/video/media group
    if (options.mediaUrls && options.mediaUrls.length > 0) {
      if (options.mediaUrls.length === 1) {
        // Single media
        const mediaType = options.mediaTypes?.[0] || 'image';
        const endpoint = mediaType === 'video' ? 'sendVideo' : 'sendPhoto';
        const mediaKey = mediaType === 'video' ? 'video' : 'photo';

        const response = await fetch(`${baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            [mediaKey]: options.mediaUrls[0],
            caption: options.text || undefined,
            parse_mode: 'HTML',
          }),
        });

        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.description || 'Failed to send media');
        }
        return data.result;
      } else {
        // Multiple media - use sendMediaGroup
        const media = options.mediaUrls.map((url, i) => ({
          type: options.mediaTypes?.[i] === 'video' ? 'video' : 'photo',
          media: url,
          caption: i === 0 ? (options.text || undefined) : undefined,
          parse_mode: i === 0 && options.text ? 'HTML' : undefined,
        }));

        const response = await fetch(`${baseUrl}/sendMediaGroup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            media,
          }),
        });

        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.description || 'Failed to send media group');
        }
        return data.result[0];
      }
    } else {
      // Text-only message
      const response = await fetch(`${baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: options.text,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.description || 'Failed to send message');
      }
      return data.result;
    }
  }
}
```

### 4.2 Update `/src/lib/publishers/index.ts`

```typescript
export * from './telegram';
```

---

## Phase 5: API Routes

### 5.1 Create `/src/app/api/telegram/connect/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { TelegramPublisher } from '@/lib/publishers/telegram';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { channel_id } = await req.json();
    if (!channel_id) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Validate channel access
    const publisher = new TelegramPublisher(pool);
    const validation = await publisher.validateChannelAccess(channel_id);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if already connected
    const existing = await pool.query(
      'SELECT id FROM connected_telegram_channels WHERE user_id = $1 AND channel_id = $2',
      [userId, channel_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Channel already connected' }, { status: 400 });
    }

    // Save to database
    await pool.query(
      `INSERT INTO connected_telegram_channels (user_id, channel_id, channel_title, channel_username)
       VALUES ($1, $2, $3, $4)`,
      [userId, channel_id, validation.channelTitle, validation.channelUsername]
    );

    return NextResponse.json({
      success: true,
      channel: {
        channel_id,
        channel_title: validation.channelTitle,
        channel_username: validation.channelUsername,
      },
    });
  } catch (error) {
    console.error('[Telegram Connect Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### 5.2 Create `/src/app/api/telegram/get-channels/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT id, channel_id, channel_title, channel_username
       FROM connected_telegram_channels
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({ channels: result.rows });
  } catch (error) {
    console.error('[Telegram Get Channels Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### 5.3 Create `/src/app/api/telegram/delete-channel/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { channel_id } = await req.json();
    if (!channel_id) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const result = await pool.query(
      'DELETE FROM connected_telegram_channels WHERE user_id = $1 AND channel_id = $2 RETURNING id',
      [userId, channel_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Telegram Delete Channel Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### 5.4 Create `/src/app/api/telegram/bot-info/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { TelegramPublisher } from '@/lib/publishers/telegram';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const publisher = new TelegramPublisher(pool);
    const botUsername = await publisher.getBotUsername();

    return NextResponse.json({ bot_username: botUsername });
  } catch (error) {
    console.error('[Telegram Bot Info Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

---

## Phase 6: Orchestrator Integration

### 6.1 Update `/src/lib/publish/orchestrator.ts`

**Add to imports:**
```typescript
import { TelegramPublisher, TelegramChannelToken } from '../publishers/telegram';
```

**Update `ExecutePublishOptions`:**
```typescript
export interface ExecutePublishOptions {
  // ... existing
  telegramTokens: TelegramChannelToken[];
}
```

**Add to `executePublish()` promises:**
```typescript
if (options.telegramTokens.length > 0) {
  const telegramPublisher = new TelegramPublisher(pool);
  publishPromises.push(
    telegramPublisher.publishToChannels(
      {
        text: options.text,
        mediaUrls: options.cloudinaryUrls,
        mediaTypes: options.mediaFiles?.map(f =>
          f.type.startsWith('video') ? 'video' : 'image'
        ),
      },
      options.telegramTokens
    ).then(result => ({
      successful: result.successful.map(mapTelegramSuccess),
      failed: result.failed.map(mapTelegramFailed),
    }))
  );
}
```

### 6.2 Add Result Mappers

**File:** `/src/lib/publish/mappers/resultMappers.ts`

```typescript
import { TelegramPublishResult, TelegramPublishError } from '../../publishers/telegram';

export function mapTelegramSuccess(result: TelegramPublishResult): SuccessfulPublishResult {
  return {
    platform: 'telegram',
    telegram_channel_id: result.channel_id,
    name: result.channel_title,
    result: {
      message_id: result.message_id,
      chat_id: result.chat_id,
    },
  };
}

export function mapTelegramFailed(error: TelegramPublishError): FailedPublishResult {
  return {
    platform: 'telegram',
    telegram_channel_id: error.channel_id,
    name: error.channel_title,
    error: error.error,
  };
}
```

---

## Phase 7: Token Service & Validators

### 7.1 Update Token Service

Add Telegram token fetching to `fetchAllTokens()`.

### 7.2 Update Request Validator

Accept `telegram_channel_ids` in request body.

---

## Phase 8: Frontend - Hooks

### 8.1 Update `useConnectedAccounts.ts`

```typescript
const [telegramChannels, setTelegramChannels] = useState<TelegramChannel[]>([]);

// Fetch telegram channels
const telegramRes = await fetch('/api/telegram/get-channels', { credentials: 'include' });
if (telegramRes.ok) {
  const data = await telegramRes.json();
  setTelegramChannels(data.channels || []);
}

return { /* ... */ telegramChannels };
```

### 8.2 Update `usePublish.ts`

Add `selectedTelegramChannels` to publish params.

---

## Phase 9: Frontend - Components

### 9.1 Create `TelegramSelector.tsx`

Checkbox list for selecting Telegram channels in publish page.

### 9.2 Create `TelegramConnect.tsx`

Connection dialog:
- Shows bot username (fetched from `/api/telegram/bot-info`)
- Instructions: "Add @botusername as admin to your channel"
- Input field for channel ID or @username
- Connect button
- Error display

### 9.3 Update `AccountSelector`

Add Telegram section with icon and selector.

### 9.4 Update Dashboard

Add Telegram to `ConnectButtons` and `AccountsTable`.

---

## Phase 10: Publish Page & API

### 10.1 Update Publish Page

Add state and handlers for Telegram channel selection.

### 10.2 Update Publish API Routes

Accept and process `telegram_channel_ids`.

---

## User Flow

```
1. User goes to Dashboard
2. Clicks "Connect Telegram Channel"
3. Sees dialog with instructions:
   ┌─────────────────────────────────────────┐
   │  Connect Telegram Channel               │
   │                                         │
   │  1. Add @MockingbirdBot as admin to     │
   │     your Telegram channel               │
   │                                         │
   │  2. Enter your channel ID or @username  │
   │                                         │
   │  Channel: [____________________]        │
   │                                         │
   │  Examples:                              │
   │  • @mychannel                           │
   │  • -1001234567890                       │
   │                                         │
   │  [Cancel]              [Connect]        │
   └─────────────────────────────────────────┘

4. User adds bot as admin in Telegram
5. User enters channel ID, clicks Connect
6. App validates bot is admin → saves channel
7. Channel appears in dashboard and publish page
```

---

## Implementation Checklist

### Backend
- [ ] Add `TELEGRAM_BOT_TOKEN` to `.env`
- [ ] Create database migration
- [ ] Create `TelegramPublisher` class
- [ ] Create API routes (connect, get-channels, delete-channel, bot-info)
- [ ] Update orchestrator
- [ ] Add result mappers
- [ ] Update token service
- [ ] Update request validator
- [ ] Update publish API routes

### Frontend
- [ ] Add types for Telegram
- [ ] Update `useConnectedAccounts` hook
- [ ] Update `usePublish` hook
- [ ] Create `TelegramSelector` component
- [ ] Create `TelegramConnect` component
- [ ] Update `AccountSelector`
- [ ] Update Dashboard (ConnectButtons, AccountsTable)
- [ ] Update Publish page

### Testing
- [ ] Test channel validation (bot is admin)
- [ ] Test text-only publishing
- [ ] Test single image publishing
- [ ] Test single video publishing
- [ ] Test media group publishing
- [ ] Test error handling (bot not admin, invalid channel)
- [ ] Test UI flow

---

## Environment Variables

```env
# Telegram Bot Token (get from @BotFather)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

---

## Bot Setup (One-time by App Owner)

1. Message @BotFather on Telegram
2. Send `/newbot`
3. Name: "Mockingbird" (or your app name)
4. Username: "MockingbirdPublishBot" (must be unique)
5. Copy the token to `.env`

---

## Advantages of Single Bot Approach

1. **Simpler for users** - No need to create their own bot
2. **Easier management** - One token to manage
3. **Better security** - Users don't handle sensitive tokens
4. **Consistent branding** - All posts come from same bot
5. **Easier updates** - Change bot settings in one place
