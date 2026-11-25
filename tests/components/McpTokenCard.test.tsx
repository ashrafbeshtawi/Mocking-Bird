/** @jest-environment jsdom */
jest.mock('@/lib/fetch', () => ({ fetchWithAuth: jest.fn() }));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchWithAuth } from '@/lib/fetch';
import { McpTokenCard } from '@/components/dashboard/McpTokenCard';

const mockFetch = fetchWithAuth as jest.Mock;
const json = (body: unknown) => Promise.resolve({ ok: true, json: async () => body });

const accounts = [
  { id: 'p1', name: 'My Page', platform: 'facebook' },
  { id: 'p2', name: 'Other Page', platform: 'facebook' },
  { id: 'x1', name: 'handle', platform: 'twitter' },
];

const existingToken = {
  id: 1,
  title: 'Claude Desktop',
  account_access: ['all'],
  created_at: '2026-10-01T00:00:00Z',
};

describe('McpTokenCard', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const { title, account_access } = JSON.parse(init.body as string);
        return json({ token: 'mb_new', tokenInfo: { id: 2, title, account_access, created_at: '2026-10-19T00:00:00Z' } });
      }
      if (init?.method === 'PUT') {
        const { id, title, account_access } = JSON.parse(init.body as string);
        return json({ tokenInfo: { ...existingToken, id, title, account_access } });
      }
      if (init?.method === 'DELETE') return json({ success: true });
      return json({ tokens: [existingToken], accounts });
    });
  });

  it('creates a titled token with the chosen account access and shows it once', async () => {
    const user = userEvent.setup();
    render(<McpTokenCard />);
    expect(await screen.findByText('Claude Desktop')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Token title'), 'Cursor');
    expect(screen.getByRole('button', { name: 'Generate token' })).toBeDisabled();

    await user.click(screen.getByLabelText('Account access'));
    await user.click(await screen.findByRole('option', { name: 'All Facebook' }));
    await user.click(screen.getByRole('option', { name: 'handle (X)' }));
    await user.click(screen.getByRole('button', { name: 'Generate token' }));

    expect(mockFetch).toHaveBeenCalledWith('/api/mcp-token', {
      method: 'POST',
      body: JSON.stringify({ title: 'Cursor', account_access: ['facebook', 'twitter:x1'] }),
    });
    expect(await screen.findByDisplayValue('mb_new')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });

  it('disables the accounts a whole-platform grant already covers', async () => {
    const user = userEvent.setup();
    render(<McpTokenCard />);
    await screen.findByText('Claude Desktop');

    await user.click(screen.getByLabelText('Account access'));
    await user.click(await screen.findByRole('option', { name: 'My Page (Facebook)' }));
    await user.click(screen.getByRole('option', { name: 'All Facebook' }));

    expect(screen.getByRole('option', { name: 'Other Page (Facebook)' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('option', { name: 'handle (X)' })).not.toHaveAttribute('aria-disabled', 'true');
  });

  it("edits a token's account access", async () => {
    const user = userEvent.setup();
    render(<McpTokenCard />);

    await user.click(await screen.findByRole('button', { name: 'Edit Claude Desktop' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByLabelText('Account access'));
    await user.keyboard('{Backspace}');
    await user.click(await screen.findByRole('option', { name: 'My Page (Facebook)' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(mockFetch).toHaveBeenCalledWith('/api/mcp-token', {
      method: 'PUT',
      body: JSON.stringify({ id: 1, title: 'Claude Desktop', account_access: ['facebook:p1'] }),
    });
    expect(await screen.findByText(/My Page \(Facebook\)/)).toBeInTheDocument();
  });

  it('marks only granted accounts missing from the connected accounts as disconnected', async () => {
    mockFetch.mockImplementation(() =>
      json({ tokens: [{ ...existingToken, account_access: ['facebook:p1', 'facebook:p9'] }], accounts })
    );
    render(<McpTokenCard />);

    expect(await screen.findByText(/My Page \(Facebook\), p9 \(Facebook, disconnected\)/)).toBeInTheDocument();
  });

  it('revokes a single token', async () => {
    const user = userEvent.setup();
    render(<McpTokenCard />);

    await user.click(await screen.findByRole('button', { name: 'Revoke Claude Desktop' }));

    expect(mockFetch).toHaveBeenCalledWith('/api/mcp-token', { method: 'DELETE', body: JSON.stringify({ id: 1 }) });
    await waitFor(() => expect(screen.queryByText('Claude Desktop')).not.toBeInTheDocument());
  });
});
