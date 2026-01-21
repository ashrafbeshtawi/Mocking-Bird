# AI Content Transformation Design

## Overview

Enable AI-powered content transformation for social media posts. Users configure AI providers, create prompts, and assign prompts to specific publishing destinations. Content is automatically transformed using the assigned prompt before publishing.

## Key Decisions

- **Provider-agnostic**: Support any OpenAI-compatible API (OpenAI, Claude, Gemini, Ollama, etc.)
- **Multiple providers**: Users can add several providers, select which one per prompt
- **Configuration location**: Prompt-destination matching configured on each platform's connection page
- **Preview optional**: "Preview AI" button available, but users can publish directly
- **Error handling**: User choice on failure (retry, publish original, or skip)
- **Provider config**: Name, API key, base URL, model name

---

## Section 1: AI Providers Configuration

### Database

New `ai_providers` table replacing `openai_api_keys`:

```sql
CREATE TABLE ai_providers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    api_key TEXT NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    model VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_ai_providers_updated_at
BEFORE UPDATE ON ai_providers
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();
```

### UI Changes

- Rename `/ai/openai-config` to `/ai/providers`
- List of configured providers with Add/Edit/Delete
- Each provider shows: name, base URL (masked key), model
- Add Provider dialog: Name, API Key (password field), Base URL (with common presets dropdown), Model name

### API

- `GET /api/ai/providers` - List user's providers
- `POST /api/ai/providers` - Add new provider
- `PUT /api/ai/providers` - Update provider
- `DELETE /api/ai/providers` - Remove provider

### Migration

Migrate existing `openai_api_keys` data to new table with `base_url = 'https://api.openai.com/v1'` and `model = 'gpt-4o'`.

---

## Section 2: Prompts + Provider Linking

### Database Changes

Add `provider_id` column to existing `ai_prompts` table:

```sql
ALTER TABLE ai_prompts
ADD COLUMN provider_id INTEGER REFERENCES ai_providers(id) ON DELETE SET NULL;
```

Nullable - prompts without a provider are "templates" that can't be used until one is assigned.

### UI Changes to Prompts Page (`/ai/prompts`)

- Add Provider dropdown in Add/Edit Prompt dialogs
- Show provider name badge next to each prompt in the list
- If no providers configured, show info message: "Add an AI provider first to use prompts"
- Prompts with deleted/missing providers show warning badge

### Validation

- When assigning prompt to destination, warn if prompt has no provider
- Prompt without provider = transformation skipped (publishes original)

### API Changes

- Update `POST/PUT /api/ai/prompts` to accept `provider_id`
- Return `provider_name` in prompt list for display

---

## Section 3: Prompt-Destination Matching on Platform Pages

### Database

```sql
CREATE TABLE ai_prompts_instagram_matching (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    instagram_account_id INTEGER REFERENCES connected_instagram_accounts(id) ON DELETE CASCADE,
    prompt_id INTEGER REFERENCES ai_prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, instagram_account_id)
);

CREATE TABLE ai_prompts_telegram_matching (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    telegram_channel_id INTEGER REFERENCES connected_telegram_channels(id) ON DELETE CASCADE,
    prompt_id INTEGER REFERENCES ai_prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, telegram_channel_id)
);
```

### UI Changes to Platform Pages

Each connected account card gets an "AI Prompt" dropdown:
- `/facebook` page - Each Facebook page shows prompt selector
- `/x` page - Each X account shows prompt selector
- `/instagram` page - Each Instagram account shows prompt selector
- `/telegram` page - Each Telegram channel shows prompt selector

Dropdown options:
- "None" (default) - No transformation
- List of user's prompts (showing prompt title + provider name)

### API Endpoints

- `GET /api/ai/prompt-matching/:platform` - Get all matchings for platform
- `POST /api/ai/prompt-matching/:platform` - Set/update matching for an account
- `DELETE /api/ai/prompt-matching/:platform` - Remove matching

### Visual Indicator

Accounts with prompts assigned show a small AI icon badge on the card.

---

## Section 4: Publish Flow Integration

### Before Publishing

1. User composes content and selects destinations
2. Optional "Preview AI" button appears if any selected destination has a prompt assigned
3. Clicking Preview AI shows modal with each destination's transformed content
4. User can edit transformed content per destination or proceed
5. "Publish" sends content (transformed where applicable, original otherwise)

### During Publishing (in `/api/publish`)

1. For each destination, check if prompt matching exists
2. If matched, fetch prompt + provider config
3. Call provider's API with: `system: prompt.prompt`, `user: originalContent`
4. Use transformed response as content for that destination
5. If API fails: queue for user decision (handled via streaming response)

### Streaming Updates (`/api/publish/stream`)

Extend existing stream to report:
- `ai_transforming: {destination, status}` - Shows "Transforming for X..."
- `ai_error: {destination, error, options}` - Shows error with retry/original/skip buttons
- `ai_complete: {destination, transformed}` - Transformation done

### Error Handling Flow

1. AI error occurs -> Stream sends `ai_error` event
2. Frontend shows modal: "Transformation failed for [destination]. Retry | Use Original | Skip"
3. User choice sent back -> Publish continues accordingly

---

## Section 5: Navigation & Page Structure

### AI Section in Navbar

New structure:
- AI Tools -> `/ai` (landing page with two cards)
  - **Providers** card -> `/ai/providers` (renamed from openai-config)
  - **Prompts** card -> `/ai/prompts`

### Page Flow

```
/ai (hub page)
├── /ai/providers (manage API providers)
└── /ai/prompts (manage prompts, each linked to a provider)

/facebook, /x, /instagram, /telegram
└── Each account card has prompt selector dropdown
```

### Empty States

- No providers -> Prompts page shows "Add a provider first"
- No prompts -> Platform pages show disabled dropdown with "Create prompts first"
- Provider deleted -> Affected prompts show warning, matching still visible but inactive

---

## Section 6: Edge Cases & Data Integrity

### Cascade Behavior

- Provider deleted -> `prompt.provider_id` set to NULL (prompts kept, just inactive)
- Prompt deleted -> All matchings for that prompt deleted (cascade)
- Account disconnected -> Matching record deleted (existing cascade behavior)

### Validation Rules

- Can't use prompt for transformation if `provider_id` is NULL
- API key validated on provider save (optional: test call to verify)
- Base URL must be valid URL format
- Model name required, non-empty string

### Rate Limiting

- AI transformations count against provider's rate limits (user's responsibility)
- If publishing to 10 destinations with same prompt, make 10 separate API calls (simple, no batching)

### Content Limits

- If transformed content exceeds platform limits (e.g., 280 chars for X), show warning in preview
- During publish without preview, truncate with "..." and log warning

### History/Analytics

- `publish_history` stores original content (as today)
- Add `ai_transformed: boolean` flag to track which posts used AI
- Detailed transformation results not stored (privacy, storage)

---

## Files to Create/Modify

### New Files
- `migrations/012_create_ai_providers_table.sql`
- `migrations/013_add_provider_id_to_ai_prompts.sql`
- `migrations/014_create_ai_prompts_instagram_matching.sql`
- `migrations/015_create_ai_prompts_telegram_matching.sql`
- `migrations/016_add_ai_transformed_to_publish_history.sql`
- `src/app/api/ai/providers/route.ts`
- `src/app/api/ai/prompt-matching/[platform]/route.ts`
- `src/app/ai/page.tsx` (hub page)
- `src/app/ai/providers/page.tsx`
- `src/lib/ai/transformService.ts`
- `src/components/ai/ProviderCard.tsx`
- `src/components/ai/PromptSelector.tsx`
- `src/components/ai/PreviewModal.tsx`

### Modified Files
- `src/app/ai/prompts/page.tsx` - Add provider selection
- `src/app/api/ai/prompts/route.ts` - Handle provider_id
- `src/app/facebook/page.tsx` - Add prompt selector to cards
- `src/app/x/page.tsx` - Add prompt selector to cards
- `src/app/instagram/page.tsx` - Add prompt selector to cards
- `src/app/telegram/page.tsx` - Add prompt selector to cards
- `src/app/api/publish/route.ts` - Integrate AI transformation
- `src/app/api/publish/stream/route.ts` - Add AI status events
- `src/components/Navbar.tsx` - Update AI Tools link
