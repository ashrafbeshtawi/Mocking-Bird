/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { getProviders } from 'next-auth/react';
import AuthPage from '@/app/auth/page';

jest.mock('next-auth/react', () => ({ getProviders: jest.fn(), signIn: jest.fn() }));

const mockGetProviders = getProviders as jest.Mock;

describe('auth page', () => {
  it('shows full-width OAuth buttons while the password login is disabled', async () => {
    mockGetProviders.mockResolvedValue({ google: {}, github: {}, discord: {} });
    render(<AuthPage />);

    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toHaveTextContent('Continue with Google');
    expect(screen.queryByLabelText(/Username/)).not.toBeInTheDocument();
  });

  it('puts the password form first and shows OAuth as icon buttons while the password login is enabled', async () => {
    mockGetProviders.mockResolvedValue({ google: {}, github: {}, discord: {}, 'review-login': {} });
    render(<AuthPage />);

    expect(await screen.findByLabelText(/Username/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toHaveTextContent('');
    expect(screen.queryByText(/test/i)).not.toBeInTheDocument();
  });
});
