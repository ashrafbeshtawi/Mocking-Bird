import { createHash, randomBytes } from 'crypto';
import { callMcpTool, db, mcpToolJson } from './helpers';

// A token limited to one Facebook page and all of Telegram, for a user with two
// Facebook pages and one Telegram channel.

let userId: number;
let token: string;

const callTool = (name: string, args: Record<string, unknown>) => callMcpTool(token, name, args);

const storedTargets = async (draftId: number) =>
  (await db.query('SELECT target_accounts FROM drafts WHERE id = $1', [draftId])).rows[0].target_accounts;

beforeAll(async () => {
  userId = (
    await db.query(`INSERT INTO users (name, email) VALUES ('MCP Access', $1) RETURNING id`, [
      `mcp-access-${Date.now()}@example.com`,
    ])
  ).rows[0].id;
  await db.query(
    `INSERT INTO connected_facebook_pages (user_id, page_name, page_id, page_access_token)
     VALUES ($1, 'Page One', 'p1', 'tok'), ($1, 'Page Two', 'p2', 'tok')`,
    [userId]
  );
  await db.query(
    `INSERT INTO connected_telegram_channels (user_id, channel_id, channel_title) VALUES ($1, '-100', 'News')`,
    [userId]
  );
  token = randomBytes(24).toString('hex');
  await db.query(
    "INSERT INTO mcp_tokens (user_id, token_hash, title, account_access) VALUES ($1, $2, 'Scoped', $3)",
    [userId, createHash('sha256').update(token).digest('hex'), ['facebook:p1', 'telegram']]
  );
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
  await db.end();
});

describe('MCP account access', () => {
  it('list_connected_accounts returns only the accounts the token may use', async () => {
    const { accounts } = mcpToolJson(await callTool('list_connected_accounts', {}));

    expect(accounts).toEqual([
      { platform: 'facebook', id: 'p1', name: 'Page One' },
      { platform: 'telegram', id: '-100', name: 'News' },
    ]);
  });

  it('add_draft targets accounts the token may use', async () => {
    const targets = [
      { platform: 'facebook', account_id: 'p1' },
      { platform: 'telegram', account_id: '-100' },
    ];
    const { draft } = mcpToolJson(await callTool('add_draft', { text: 'hello', target_accounts: targets }));

    expect(draft.target_accounts).toEqual(targets);
    expect(draft.target_platforms).toEqual(['facebook', 'telegram']);
    expect(await storedTargets(draft.id)).toEqual(targets);
  });

  it('add_draft rejects accounts outside the token access or not connected', async () => {
    const result = await callTool('add_draft', {
      text: 'hello',
      target_accounts: [
        { platform: 'facebook', account_id: 'p2' },
        { platform: 'telegram', account_id: '-999' },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('facebook:p2, telegram:-999');
  });

  const insertDraft = async (text: string, targets: object[]) =>
    (
      await db.query(`INSERT INTO drafts (user_id, text, target_accounts) VALUES ($1, $2, $3) RETURNING id`, [
        userId,
        text,
        JSON.stringify(targets),
      ])
    ).rows[0].id;

  it('lists, edits and deletes only drafts whose every target the token may use', async () => {
    const mixedId = await insertDraft('mixed zz', [
      { platform: 'facebook', account_id: 'p1' },
      { platform: 'facebook', account_id: 'p2' },
    ]);
    const ownId = await insertDraft('own zz', [{ platform: 'telegram', account_id: '-100' }]);

    const { drafts, total } = mcpToolJson(await callTool('search_drafts', { query: 'zz' }));
    expect(drafts.map((d: { id: number }) => d.id)).toEqual([ownId]);
    expect(total).toBe(1);

    expect((await callTool('edit_draft', { id: mixedId, text: 'changed' })).isError).toBe(true);
    expect((await callTool('delete_draft', { id: mixedId })).isError).toBe(true);
    expect((await db.query('SELECT text FROM drafts WHERE id = $1', [mixedId])).rows[0].text).toBe('mixed zz');

    const { draft } = mcpToolJson(
      await callTool('edit_draft', { id: ownId, target_accounts: [{ platform: 'facebook', account_id: 'p1' }] })
    );
    expect(await storedTargets(draft.id)).toEqual([{ platform: 'facebook', account_id: 'p1' }]);
    expect(mcpToolJson(await callTool('delete_draft', { id: ownId })).deleted).toBe(true);
  });

  it('edit_draft keeps targets already on the draft whose account was disconnected', async () => {
    const draftId = await insertDraft('stale', [{ platform: 'telegram', account_id: '-999' }]);
    const targets = [
      { platform: 'telegram', account_id: '-999' },
      { platform: 'telegram', account_id: '-100' },
    ];

    const { draft } = mcpToolJson(await callTool('edit_draft', { id: draftId, target_accounts: targets }));

    expect(draft.target_accounts).toEqual(targets);
  });

  it('get_publish_history lists entries sharing an account with the token, with only those destinations', async () => {
    await db.query(
      `INSERT INTO publish_history (user_id, content, publish_status, publish_destinations) VALUES
         ($1, 'shared post', 'success', $2), ($1, 'other post', 'success', $3)`,
      [
        userId,
        JSON.stringify([
          { platform: 'facebook', account_id: 'p1', success: true },
          { platform: 'facebook', account_id: 'p2', success: true },
        ]),
        JSON.stringify([{ platform: 'facebook', account_id: 'p2', success: true }]),
      ]
    );

    const { entries, total } = mcpToolJson(await callTool('get_publish_history', {}));

    expect(entries.map((e: { content: string }) => e.content)).toEqual(['shared post']);
    expect(total).toBe(1);
    expect(entries[0].publish_destinations).toEqual([{ platform: 'facebook', account_id: 'p1', success: true }]);
  });
});
