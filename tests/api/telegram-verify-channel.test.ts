jest.mock('@/lib/api-auth', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

import { POST, PUT } from '@/app/api/telegram/verify-channel/route';
import { getAuthUserId } from '@/lib/api-auth';
import pool from '@/lib/db';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockQuery = pool.query as jest.Mock;

const CHANNEL_CHAT_ID = -1001234567890;
const OTHER_CHAT_ID = -1009999999999;

interface Verification {
  id: number;
  user_id: string;
  channel_id: string;
  chat_id: string;
  code: string;
  verified_at: Date | null;
}

/** Minimal stand-in for the telegram_verifications / connected_telegram_channels tables. */
let verifications: Verification[];
let nextId: number;

function fakeQuery(sql: string, params: unknown[] = []) {
  if (sql.includes('FROM connected_telegram_channels')) return { rows: [] };
  if (sql.includes('INSERT INTO connected_telegram_channels')) return { rows: [{ id: 7 }] };
  if (sql.includes('DELETE FROM telegram_verifications WHERE expires_at')) return { rows: [], rowCount: 0 };
  if (sql.includes('INSERT INTO telegram_verifications')) {
    const [user_id, channel_id, chat_id, code] = params as string[];
    verifications = verifications.filter((v) => !(v.user_id === user_id && v.channel_id === channel_id));
    verifications.push({ id: nextId++, user_id, channel_id, chat_id, code, verified_at: null });
    return { rows: [], rowCount: 1 };
  }
  if (sql.includes('SELECT id, verified_at')) {
    const [user_id, channel_id] = params;
    const row = verifications.find((v) => v.user_id === user_id && v.channel_id === channel_id);
    return { rows: row ? [{ id: row.id, verified_at: row.verified_at, expired: false }] : [] };
  }
  if (sql.includes('UPDATE telegram_verifications SET verified_at')) {
    const [code, chat_id] = params;
    const rows = verifications.filter((v) => v.code === code && v.chat_id === chat_id && !v.verified_at);
    rows.forEach((v) => (v.verified_at = new Date()));
    return { rows: rows.map((v) => ({ id: v.id })), rowCount: rows.length };
  }
  if (sql.includes('DELETE FROM telegram_verifications WHERE id')) {
    verifications = verifications.filter((v) => v.id !== params[0]);
    return { rows: [], rowCount: 1 };
  }
  throw new Error(`Unexpected query: ${sql}`);
}

/** Fake Bot API: getUpdates returns the oldest 100 unconfirmed updates, like Telegram. */
let pendingUpdates: Array<{ update_id: number; channel_post: Record<string, unknown> }>;
let nextUpdateId: number;
let getUpdatesResponse: Record<string, unknown> | null;
const fetchMock = jest.fn();

function channelPost(chatId: number, text: string) {
  pendingUpdates.push({
    update_id: nextUpdateId++,
    channel_post: { message_id: nextUpdateId, chat: { id: chatId, type: 'channel' }, text },
  });
}

function fakeTelegram(url: string, init?: RequestInit) {
  const method = url.split('/').pop();
  const body = init?.body ? JSON.parse(init.body as string) : {};
  let payload: unknown;
  switch (method) {
    case 'getChat':
      payload = { ok: true, result: { id: CHANNEL_CHAT_ID, type: 'channel', title: 'My Channel', username: 'mychannel' } };
      break;
    case 'getChatAdministrators':
      payload = { ok: true, result: [{ user: { id: 1 }, status: 'administrator' }] };
      break;
    case 'getMe':
      payload = { ok: true, result: { id: 1, username: 'mockingbird_bot' } };
      break;
    case 'getUpdates': {
      if (getUpdatesResponse) {
        payload = getUpdatesResponse;
        break;
      }
      if (body.offset !== undefined) {
        pendingUpdates = pendingUpdates.filter((u) => u.update_id >= body.offset);
      }
      payload = { ok: true, result: pendingUpdates.slice(0, Math.min(body.limit ?? 100, 100)) };
      break;
    }
    case 'deleteMessage':
      payload = { ok: true, result: true };
      break;
    default:
      throw new Error(`Unexpected Telegram call: ${url}`);
  }
  return Promise.resolve({ json: () => Promise.resolve(payload) });
}

const request = (method: 'POST' | 'PUT', body: unknown) =>
  new Request('http://localhost/api/telegram/verify-channel', { method, body: JSON.stringify(body) });

async function startVerification(channelId = '@mychannel'): Promise<string> {
  const response = await POST(request('POST', { channel_id: channelId }));
  expect(response.status).toBe(200);
  return (await response.json()).verification_code;
}

const telegramCalls = (method: string) => fetchMock.mock.calls.filter(([url]) => (url as string).endsWith(`/${method}`));

describe('Telegram channel verification', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    verifications = [];
    nextId = 1;
    pendingUpdates = [];
    nextUpdateId = 500;
    getUpdatesResponse = null;
    mockGetAuthUserId.mockResolvedValue('42');
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => Promise.resolve(fakeQuery(sql, params)));
    fetchMock.mockImplementation(fakeTelegram);
  });

  it('stores the pending verification with the numeric chat id from getChat', async () => {
    const code = await startVerification();

    expect(code).toMatch(/^MB-[0-9A-F]{8}$/);
    expect(verifications).toEqual([
      expect.objectContaining({ user_id: '42', channel_id: '@mychannel', chat_id: String(CHANNEL_CHAT_ID), code }),
    ]);
  });

  it('verifies even when more than 100 unrelated channel posts are pending before the code post', async () => {
    const code = await startVerification();
    for (let i = 0; i < 250; i++) channelPost(OTHER_CHAT_ID, `unrelated post ${i}`);
    channelPost(CHANNEL_CHAT_ID, `Verifying: ${code}`);

    const response = await PUT(request('PUT', { channel_id: '@mychannel' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({ success: true, verified: true, channel: { id: '7', channel_id: '@mychannel' } });

    // Paged with offsets and confirmed everything it read
    expect(telegramCalls('getUpdates').length).toBeGreaterThan(3);
    expect(pendingUpdates).toHaveLength(0);
    // The code post was removed from the channel
    expect(JSON.parse(telegramCalls('deleteMessage')[0][1].body)).toMatchObject({ chat_id: CHANNEL_CHAT_ID });
    expect(verifications).toHaveLength(0);
  });

  it('does not accept the code when it was posted in a different chat', async () => {
    const code = await startVerification();
    channelPost(OTHER_CHAT_ID, code);

    const data = await (await PUT(request('PUT', { channel_id: '@mychannel' }))).json();

    expect(data).toMatchObject({ success: false, verified: false });
    expect(telegramCalls('deleteMessage')).toHaveLength(0);
  });

  it("still verifies when another user's check already read and confirmed the code post", async () => {
    const code = await startVerification();

    mockGetAuthUserId.mockResolvedValue('99');
    await startVerification('@otherchannel');
    channelPost(CHANNEL_CHAT_ID, code);
    const other = await (await PUT(request('PUT', { channel_id: '@otherchannel' }))).json();
    expect(other.verified).toBe(false);
    expect(pendingUpdates).toHaveLength(0);

    mockGetAuthUserId.mockResolvedValue('42');
    const data = await (await PUT(request('PUT', { channel_id: '@mychannel' }))).json();
    expect(data).toMatchObject({ success: true, verified: true });
  });

  it('explains the failure when the bot has a webhook set (409)', async () => {
    await startVerification();
    getUpdatesResponse = {
      ok: false,
      error_code: 409,
      description: "Conflict: can't use getUpdates method while webhook is active; use deleteWebhook to delete the webhook first",
    };

    const response = await PUT(request('PUT', { channel_id: '@mychannel' }));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toMatch(/webhook/i);
  });

  it('rejects a check without a pending verification', async () => {
    const response = await PUT(request('PUT', { channel_id: '@mychannel' }));

    expect(response.status).toBe(400);
    expect(telegramCalls('getUpdates')).toHaveLength(0);
  });
});
