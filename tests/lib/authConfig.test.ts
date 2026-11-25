jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn(() => ({ id: 'google' })) }));
jest.mock('next-auth/providers/github', () => ({ __esModule: true, default: jest.fn(() => ({ id: 'github' })) }));
jest.mock('next-auth/providers/discord', () => ({ __esModule: true, default: jest.fn(() => ({ id: 'discord' })) }));

import type { Account, Profile } from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const signIn = (provider: string, profile?: Profile, accessToken?: string) =>
  authConfig.callbacks!.signIn!({
    user: { id: '1', email: 'victim@example.com' },
    account: { provider, type: 'oauth', providerAccountId: '1', access_token: accessToken } as Account,
    profile,
  });

const mockGitHubEmails = (body: unknown, ok = true) => {
  const fetchMock = jest.fn().mockResolvedValue({ ok, status: ok ? 200 : 401, json: async () => body });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

describe('authConfig signIn callback', () => {
  it('rejects a Discord login whose e-mail is not verified', async () => {
    expect(await signIn('discord', { email: 'victim@example.com', verified: false })).toBe(false);
    expect(await signIn('discord', { email: 'victim@example.com' })).toBe(false);
  });

  it('accepts a Discord login with a verified e-mail', async () => {
    expect(await signIn('discord', { email: 'victim@example.com', verified: true })).toBe(true);
  });

  it('rejects a Google login whose e-mail is not verified', async () => {
    expect(await signIn('google', { email: 'victim@example.com', email_verified: false })).toBe(false);
    expect(await signIn('google', { email: 'victim@example.com' })).toBe(false);
  });

  it('accepts a Google login with a verified e-mail', async () => {
    expect(await signIn('google', { email: 'victim@example.com', email_verified: true })).toBe(true);
  });

  it('accepts a GitHub login whose e-mail GitHub lists as verified', async () => {
    const fetchMock = mockGitHubEmails([
      { email: 'other@example.com', verified: false, primary: false },
      { email: 'Victim@Example.com', verified: true, primary: true },
    ]);
    expect(await signIn('github', { email: 'victim@example.com' }, 'gho_token')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/user/emails',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer gho_token' }) })
    );
  });

  it('rejects a GitHub login whose e-mail is not verified', async () => {
    mockGitHubEmails([{ email: 'victim@example.com', verified: false, primary: true }]);
    expect(await signIn('github', { email: 'victim@example.com' }, 'gho_token')).toBe(false);
  });

  it('rejects a GitHub login when only another address is verified', async () => {
    mockGitHubEmails([
      { email: 'victim@example.com', verified: false, primary: true },
      { email: 'attacker@example.com', verified: true, primary: false },
    ]);
    expect(await signIn('github', { email: 'victim@example.com' }, 'gho_token')).toBe(false);
  });

  it('rejects a GitHub login when /user/emails fails or there is no token', async () => {
    mockGitHubEmails({ message: 'Bad credentials' }, false);
    expect(await signIn('github', { email: 'victim@example.com' }, 'gho_token')).toBe(false);

    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    expect(await signIn('github', { email: 'victim@example.com' }, 'gho_token')).toBe(false);

    const fetchMock = mockGitHubEmails([]);
    expect(await signIn('github', { email: 'victim@example.com' })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts credentials logins', async () => {
    expect(await signIn('credentials')).toBe(true);
  });
});
