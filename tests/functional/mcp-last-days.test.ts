import { createHash, randomBytes } from 'crypto';
import { db, fetchPage } from './helpers';

// Drives the MCP endpoint over HTTP like a real client: bearer token, JSON-RPC
// tools/call. Rows are backdated so `last_days` has something to cut off.

let userId: number;
let token: string;

async function callTool(name: string, args: Record<string, unknown>) {
  const response = await fetchPage('/api/mcp', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  });
  const body = await response.text();
  // Streamable HTTP answers with one SSE `data:` line or plain JSON.
  const payload = JSON.parse(body.includes('data: ') ? body.split('data: ')[1].split('\n')[0] : body);
  return payload.result;
}

const toolJson = (result: { content: { text: string }[] }) => JSON.parse(result.content[0].text);

beforeAll(async () => {
  const { rows } = await db.query(`INSERT INTO users (name, email) VALUES ('MCP Test', $1) RETURNING id`, [
    `mcp-last-days-${Date.now()}@example.com`,
  ]);
  userId = rows[0].id;
  token = randomBytes(24).toString('hex');
  await db.query('INSERT INTO mcp_tokens (user_id, token_hash) VALUES ($1, $2)', [
    userId,
    createHash('sha256').update(token).digest('hex'),
  ]);

  await db.query(
    `INSERT INTO drafts (user_id, text, updated_at) VALUES
       ($1, 'fresh draft', NOW() - INTERVAL '1 day'),
       ($1, 'old draft',   NOW() - INTERVAL '30 days')`,
    [userId]
  );
  await db.query(
    `INSERT INTO publish_history (user_id, content, publish_status, created_at) VALUES
       ($1, 'fresh post', 'success', NOW() - INTERVAL '2 days'),
       ($1, 'old post',   'success', NOW() - INTERVAL '40 days')`,
    [userId]
  );
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
  await db.end();
});

describe('MCP last_days', () => {
  it('list_drafts returns drafts updated within the last N days', async () => {
    const page = toolJson(await callTool('list_drafts', { last_days: 7 }));

    expect(page.drafts.map((d: { text: string }) => d.text)).toEqual(['fresh draft']);
    expect(page.total).toBe(1);
  });

  it('list_drafts returns every draft without last_days', async () => {
    const page = toolJson(await callTool('list_drafts', {}));

    expect(page.drafts.map((d: { text: string }) => d.text)).toEqual(['fresh draft', 'old draft']);
    expect(page.drafts[0]).toEqual(expect.objectContaining({ created_at: expect.any(String), updated_at: expect.any(String) }));
  });

  it('search_drafts combines the text query with last_days', async () => {
    expect(toolJson(await callTool('search_drafts', { query: 'draft', last_days: 7 })).total).toBe(1);
    expect(toolJson(await callTool('search_drafts', { query: 'old', last_days: 60 })).total).toBe(1);
  });

  it('get_publish_history returns entries published within the last N days', async () => {
    const page = toolJson(await callTool('get_publish_history', { last_days: 7 }));

    expect(page.entries.map((e: { content: string }) => e.content)).toEqual(['fresh post']);
    expect(page.total).toBe(1);
    expect(page.entries[0].created_at).toEqual(expect.any(String));
  });

  it('rejects a non-positive last_days', async () => {
    const result = await callTool('list_drafts', { last_days: 0 });

    expect(result.isError).toBe(true);
  });
});
