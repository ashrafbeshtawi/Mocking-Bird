jest.mock('@/lib/api-auth', () => ({
  getAuthUserId: jest.fn(),
}));

const mockClientQuery = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { connect: jest.fn(async () => ({ query: mockClientQuery, release: jest.fn() })) },
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/publish/download-report/route';
import { getAuthUserId } from '@/lib/api-auth';
import { escapeHtml } from '@/lib/escapeHtml';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;

const request = (id: string) =>
  new NextRequest(`http://localhost:3000/api/publish/download-report?id=${encodeURIComponent(id)}`);

describe('escapeHtml', () => {
  it('escapes the five HTML special characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
    );
  });

  it('turns null and undefined into an empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('GET /api/publish/download-report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('42');
  });

  it('escapes post text and publish log instead of rendering them as markup', async () => {
    mockClientQuery.mockResolvedValueOnce({
      rows: [{
        content: 'I <3 this & <script>alert(1)</script>',
        publish_report: 'Telegram: <img src=x onerror=alert(2)>',
        publish_status: 'partial_success',
        created_at: '2026-11-01T10:00:00Z',
      }],
    });

    const response = await GET(request('7'));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('I &lt;3 this &amp; &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Telegram: &lt;img src=x onerror=alert(2)&gt;');
    expect(html).toContain('class="status-partial_success"');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="publish_report_7.html"');
  });

  it('rejects an id that is not purely digits, before touching the database', async () => {
    const response = await GET(request('5<img src=x onerror=alert(1)>'));

    expect(response.status).toBe(400);
    expect(mockClientQuery).not.toHaveBeenCalled();
  });

  it('leaves the status class off for an unknown status', async () => {
    mockClientQuery.mockResolvedValueOnce({
      rows: [{
        content: 'hi',
        publish_report: null,
        publish_status: 'x" onmouseover="alert(1)',
        created_at: '2026-11-01T10:00:00Z',
      }],
    });

    const html = await (await GET(request('8'))).text();

    expect(html).toContain('<span class="">');
    expect(html).not.toContain('onmouseover="');
  });
});
