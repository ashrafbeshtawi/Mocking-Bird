/** @jest-environment jsdom */
jest.mock('@/lib/fetch', () => ({ fetchWithAuth: jest.fn() }));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchWithAuth } from '@/lib/fetch';
import { McpTokenCard } from '@/components/dashboard/McpTokenCard';

const mockFetch = fetchWithAuth as jest.Mock;
const json = (body: unknown) => Promise.resolve({ ok: true, json: async () => body });

describe('McpTokenCard', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return json({ token: 'mb_new', tokenInfo: { id: 2, title: 'Cursor', created_at: '2026-10-19T00:00:00Z' } });
      }
      if (init?.method === 'DELETE') return json({ success: true });
      return json({ tokens: [{ id: 1, title: 'Claude Desktop', created_at: '2026-10-01T00:00:00Z' }] });
    });
  });

  it('creates a titled token next to the existing ones and shows it once', async () => {
    const user = userEvent.setup();
    render(<McpTokenCard />);
    expect(await screen.findByText('Claude Desktop')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Token title'), 'Cursor');
    await user.click(screen.getByRole('button', { name: 'Generate token' }));

    expect(mockFetch).toHaveBeenCalledWith('/api/mcp-token', { method: 'POST', body: JSON.stringify({ title: 'Cursor' }) });
    expect(await screen.findByDisplayValue('mb_new')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('Claude Desktop')).toBeInTheDocument();
  });

  it('revokes a single token', async () => {
    const user = userEvent.setup();
    render(<McpTokenCard />);

    await user.click(await screen.findByRole('button', { name: 'Revoke Claude Desktop' }));

    expect(mockFetch).toHaveBeenCalledWith('/api/mcp-token', { method: 'DELETE', body: JSON.stringify({ id: 1 }) });
    await waitFor(() => expect(screen.queryByText('Claude Desktop')).not.toBeInTheDocument());
  });
});
