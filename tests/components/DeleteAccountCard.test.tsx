/** @jest-environment jsdom */
jest.mock('next-auth/react', () => ({ signOut: jest.fn() }));
jest.mock('@/lib/fetch', () => ({ fetchWithAuth: jest.fn() }));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signOut } from 'next-auth/react';
import { fetchWithAuth } from '@/lib/fetch';
import { DeleteAccountCard } from '@/components/dashboard/DeleteAccountCard';

const mockFetch = fetchWithAuth as jest.Mock;
const mockSignOut = signOut as jest.Mock;

describe('DeleteAccountCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks for confirmation, deletes the account and signs out', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const user = userEvent.setup();
    render(<DeleteAccountCard />);

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(mockFetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete permanently' }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' }));
    expect(mockFetch).toHaveBeenCalledWith('/api/account', { method: 'DELETE' });
  });

  it('shows the error and keeps the session when deletion fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Database unavailable' }) });
    const user = userEvent.setup();
    render(<DeleteAccountCard />);

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }));

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
