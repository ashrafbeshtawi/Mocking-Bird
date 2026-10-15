import { createHash, randomBytes } from 'crypto';
import { callMcpTool, db, mcpToolJson as toolJson } from './helpers';

// add_draft / edit_draft carry the YouTube title and suggested TikTok settings
// through the real schema, and list_drafts returns them.

let userId: number;
let token: string;

const callTool = (name: string, args: Record<string, unknown>) => callMcpTool(token, name, args);

const tiktok = {
  privacyLevel: 'SELF_ONLY',
  allowComment: true,
  allowDuet: false,
  allowStitch: false,
  isYourBrand: false,
  isBrandedContent: false,
};

beforeAll(async () => {
  const { rows } = await db.query(`INSERT INTO users (name, email) VALUES ('MCP Test', $1) RETURNING id`, [
    `mcp-draft-settings-${Date.now()}@example.com`,
  ]);
  userId = rows[0].id;
  token = randomBytes(24).toString('hex');
  await db.query("INSERT INTO mcp_tokens (user_id, token_hash, title, account_access) VALUES ($1, $2, 'Functional test', '{all}')", [
    userId,
    createHash('sha256').update(token).digest('hex'),
  ]);
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
  await db.end();
});

describe('MCP draft settings', () => {
  it('stores the YouTube title and TikTok settings, keeps them on unrelated edits and clears TikTok on null', async () => {
    const { draft } = toolJson(
      await callTool('add_draft', { text: 'launch', youtube_title: 'Launch day', tiktok_settings: tiktok })
    );
    expect(draft).toEqual(expect.objectContaining({ youtube_title: 'Launch day', tiktok_settings: tiktok }));

    const edited = toolJson(await callTool('edit_draft', { id: draft.id, text: 'launch!' })).draft;
    expect(edited).toEqual(expect.objectContaining({ text: 'launch!', youtube_title: 'Launch day', tiktok_settings: tiktok }));

    const cleared = toolJson(await callTool('edit_draft', { id: draft.id, tiktok_settings: null })).draft;
    expect(cleared.tiktok_settings).toBeNull();

    const listed = toolJson(await callTool('list_drafts', {})).drafts;
    expect(listed[0]).toEqual(expect.objectContaining({ id: draft.id, youtube_title: 'Launch day', tiktok_settings: null }));
  });

  it('rejects TikTok settings TikTok would refuse', async () => {
    const result = await callTool('add_draft', { text: 'ad', tiktok_settings: { ...tiktok, isBrandedContent: true } });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/Branded content on TikTok cannot be private/);
  });
});
