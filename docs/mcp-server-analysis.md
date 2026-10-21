# MCP Server Analysis

Endpoint: `/api/mcp` (`src/app/api/mcp/route.ts`), built on `mcp-handler` (`createMcpHandler` + `withMcpAuth`). Server info: `mockingbird` v1.0.0. Handles `GET`, `POST`, `DELETE`.

## Authentication

- Bearer token required on every request (`withMcpAuth(..., { required: true })`).
- Tokens are created on the dashboard (MCP Access card). A user can hold several, each with a title (`src/lib/mcpTokens.ts`, migration `034`).
- Format `mb_<64 hex>`; only the SHA-256 hash is stored in `mcp_tokens`. The plaintext is shown once.
- `verifyToken` resolves the hash to a `user_id` and puts it in `authInfo.extra.userId`. Every tool reads it through `userIdFrom()` and scopes all queries to that user.
- Tokens have no scopes and no expiry; a token grants full access to every tool until it is revoked.

## Tools

| Tool | Kind | Inputs | Backed by |
|---|---|---|---|
| `get_connected_social_media_types` | read | none | `getConnectedPlatformTypes` — returns platform **types** with at least one connected account |
| `list_drafts` | read | `limit`, `offset`, `last_days` | `listDrafts` |
| `search_drafts` | read | `query`, `limit`, `offset`, `last_days` | `listDrafts` (ILIKE on text) |
| `get_publish_history` | read | `limit`, `offset`, `last_days` | `listPublishHistory` (report text omitted) |
| `add_draft` | write | `text`, `target_platforms?`, `media?` (URLs) | `createDraft` |
| `edit_draft` | write | `id`, `text?`, `target_platforms?`, `media?` | `updateDraft` (partial: omitted fields keep their value) |
| `delete_draft` | write | `id` | `deleteDraft` |

Platforms (`src/types/accounts.ts`): `facebook`, `instagram`, `twitter`, `telegram`, `linkedin`, `youtube`, `tiktok`.

Media URLs passed to `add_draft` / `edit_draft` are validated first, then ingested into Cloudinary (`ingestRemoteMedia`), so drafts never reference external URLs that may expire.

## Does the MCP user choose the accounts or account types when publishing?

**The MCP server cannot publish.** No tool calls the publish pipeline (`src/lib/publish/orchestrator.ts`); an MCP client can only create, edit, delete and read drafts, and read publish history. Publishing always happens in the web UI by a signed-in user.

What the MCP client can set is the draft's **`target_platforms`: platform types only, never specific accounts.** A draft stores `target_platforms: Platform[]`; there is no account/page/channel ID anywhere in the draft model (`src/lib/drafts.ts`). Likewise, `get_connected_social_media_types` tells the client which types are connected, not which accounts.

When the draft is later published from the UI, the types are expanded to **every connected account of that type**:

- `src/app/drafts/page.tsx` (publish from the draft preview): e.g. `targets.includes('twitter') ? xAccounts.map((a) => a.id) : []` — all X accounts, all Facebook pages, all Telegram channels, etc. Instagram gets feed publish on all accounts, never stories.
- `src/app/publish/page.tsx` (open the draft in the composer via `/publish?draft=<id>`): the same expansion preselects all accounts of each target type; the user can then deselect accounts before publishing.

In contrast, the publish API itself (`PublishRequest` in `src/lib/publish/types.ts`) is account-level: `facebookPages`, `xAccounts`, `instagramPublishAccounts`, `instagramStoryAccounts`, `telegramChannels`, `linkedinAccounts`, `youtubeChannels`, `tiktokAccounts` are lists of account IDs.

### Consequences

- A user with several accounts on one platform cannot, via MCP, target only one of them; the draft-page publish button sends to all of them. Only the composer lets them narrow it down by hand.
- Per-platform options the publish API supports are not settable via MCP: Instagram story vs. feed, YouTube title, TikTok settings, per-platform `contentSelection`.
- `get_publish_history` does expose account-level data (`publish_destinations` holds `platform`, `account_id`, `account_name`, `post_type`, `success`), so the client can see which accounts were posted to after the fact, but cannot use those IDs as input anywhere.

## Possible next steps (not implemented)

1. A `list_connected_accounts` tool returning account IDs and names per platform.
2. An optional `target_accounts` field on drafts, used by the UI instead of the all-accounts expansion when present.
3. A `publish_draft` tool calling the orchestrator, if publishing from AI clients is wanted. This is the riskiest change (outward-facing, irreversible) and would warrant a token scope separating read/draft access from publish access.
