# Queue Post Feature Design

## Overview

Add a "Queue Post" button to the publish page that stores posts for later batch publishing via webhook.

## Status: IMPLEMENTED

## Database Schema

**New table: `scheduled_posts`** (Migration: `016_create_scheduled_posts_table.sql`)

```sql
CREATE TABLE scheduled_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]',
    destinations JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_posts_user_status ON scheduled_posts(user_id, status);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
```

**destinations JSONB structure:**
```json
[
  {
    "platform": "facebook",
    "account_id": "123",
    "account_name": "My Page",
    "transformed_content": "AI-transformed text...",
    "post_type": "feed"  // Optional, for Instagram: "feed" or "story"
  }
]
```

**Status values:** `pending` → `processing` → `completed` / `failed`

## API Endpoints

### 1. Queue Post - `POST /api/publish/queue`
- Receives: content, media_urls, selected accounts (same format as publish)
- Transforms content per destination using AI prompts (if assigned)
- Stores in `scheduled_posts` table
- Does NOT delete media
- Returns: `{ success: true, id: number, destinations_count: number }`

### 2. View Queue - `GET /api/publish/queue`
- Lists all queued posts for authenticated user
- Returns: `{ success: true, posts: [] }`

### 3. Publish Webhook - `POST /api/webhooks/publish`
- **Secured with:** `x-webhook-secret` header
- Fetches all `pending` posts
- Marks as `processing`
- Publishes all posts in parallel (`Promise.all`)
- Saves publish report to `publish_history` for each
- Marks as `completed` or `failed`
- Returns: `{ success, total, succeeded, failed, results[] }`

### 4. Media Cleanup Webhook - `POST /api/webhooks/cleanup-media`
- **Secured with:** `x-webhook-secret` header
- Deletes media from Cloudinary for completed posts
- Clears `media_urls` field after cleanup
- Manually triggered
- Returns: `{ success, posts_processed, media_deleted }`

## UI Changes

**Publish page buttons:**
```
[Queue Post]  [Publish Now]
```

- "Queue Post" uses outlined/secondary style
- Shows loading spinner while queueing
- On success: shows snackbar "Post added to queue (X destinations)"
- On error: shows error snackbar
- Clears form after successful queue

## Other Changes

- Removed media deletion from normal publish flow (`/api/publish/route.ts` and `/api/publish/stream/route.ts`)
- Media now persists until manually cleaned up via webhook

## Environment Variables

```
WEBHOOK_SECRET=your-secret-here
```

## Files Created/Modified

### Created:
- `migrations/016_create_scheduled_posts_table.sql`
- `src/app/api/publish/queue/route.ts`
- `src/app/api/webhooks/publish/route.ts`
- `src/app/api/webhooks/cleanup-media/route.ts`

### Modified:
- `src/app/api/publish/route.ts` - removed media cleanup
- `src/app/api/publish/stream/route.ts` - removed media cleanup
- `src/app/publish/page.tsx` - added Queue Post button

## Usage

1. Run migration: `psql -f migrations/016_create_scheduled_posts_table.sql`
2. Set `WEBHOOK_SECRET` in environment
3. Use "Queue Post" button to add posts to queue
4. Trigger publish webhook: `curl -X POST -H "x-webhook-secret: YOUR_SECRET" https://your-domain/api/webhooks/publish`
5. Trigger cleanup webhook: `curl -X POST -H "x-webhook-secret: YOUR_SECRET" https://your-domain/api/webhooks/cleanup-media`
