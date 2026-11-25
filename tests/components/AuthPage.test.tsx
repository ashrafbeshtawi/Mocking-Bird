/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import AuthPage from '@/app/auth/page';

jest.mock('next-auth/react', () => ({ signIn: jest.fn() }));

describe('auth page', () => {
  it('shows only the OAuth buttons, no username/password form', () => {
    render(<AuthPage />);

    for (const label of ['Google', 'GitHub', 'Discord']) {
      expect(screen.getByRole('button', { name: `Continue with ${label}` })).toHaveTextContent(`Continue with ${label}`);
    }
    expect(screen.queryByLabelText(/Username/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Password/)).not.toBeInTheDocument();
  });
});
