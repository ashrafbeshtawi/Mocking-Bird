jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn(() => ({ id: 'google' })) }));
jest.mock('next-auth/providers/github', () => ({ __esModule: true, default: jest.fn(() => ({ id: 'github' })) }));
jest.mock('next-auth/providers/discord', () => ({ __esModule: true, default: jest.fn(() => ({ id: 'discord' })) }));

import type { Account, Profile } from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const signIn = (provider: string, profile?: Profile) =>
  authConfig.callbacks!.signIn!({
    user: { id: '1', email: 'victim@example.com' },
    account: { provider, type: 'oauth', providerAccountId: '1' } as Account,
    profile,
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

  it('accepts GitHub and credentials logins', async () => {
    expect(await signIn('github', { email: 'victim@example.com' })).toBe(true);
    expect(await signIn('credentials')).toBe(true);
  });
});
