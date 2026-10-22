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

  it('edit_draft replaces only the targets the token may use and hides the others', async () => {
    const draftId = (
      await db.query(`INSERT INTO drafts (user_id, text, target_accounts) VALUES ($1, 'both pages', $2) RETURNING id`, [
        userId,
        JSON.stringify([
          { platform: 'facebook', account_id: 'p1' },
          { platform: 'facebook', account_id: 'p2' },
        ]),
      ])
    ).rows[0].id;

    const { draft } = mcpToolJson(
      await callTool('edit_draft', { id: draftId, target_accounts: [{ platform: 'telegram', account_id: '-100' }] })
    );

    expect(draft.target_accounts).toEqual([{ platform: 'telegram', account_id: '-100' }]);
    expect(await storedTargets(draftId)).toEqual([
      { platform: 'telegram', account_id: '-100' },
      { platform: 'facebook', account_id: 'p2' },
    ]);
  });

  it('get_publish_history lists only destinations the token may use', async () => {
    await db.query(
      `INSERT INTO publish_history (user_id, content, publish_status, publish_destinations) VALUES ($1, 'post', 'success', $2)`,
      [
        userId,
        JSON.stringify([
          { platform: 'facebook', account_id: 'p1', success: true },
          { platform: 'facebook', account_id: 'p2', success: true },
        ]),
      ]
    );

    const { entries } = mcpToolJson(await callTool('get_publish_history', {}));

    expect(entries[0].publish_destinations).toEqual([{ platform: 'facebook', account_id: 'p1', success: true }]);
  });
});
