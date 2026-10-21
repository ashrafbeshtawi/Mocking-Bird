/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';

describe('landing page', () => {
  it('names every supported platform, including TikTok', () => {
    render(<LandingPage />);
    for (const label of ['TikTok', 'YouTube', 'Instagram', 'Facebook', 'X', 'LinkedIn', 'Telegram']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('explains how the product works and links to the legal pages', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { name: 'From one draft to every account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'delete your Mockingbird account' })).toHaveAttribute('href', '/delete-account');
  });
});
