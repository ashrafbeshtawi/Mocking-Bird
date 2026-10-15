/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import ImpressumPage from '@/app/impressum/page';
import PrivacyPage from '@/app/privacy/page';
import TermsPage from '@/app/terms/page';
import DeleteAccountPage from '@/app/delete-account/page';

const heading = () => screen.getByRole('heading', { level: 1 });
// Pages may name the contact address more than once (e.g. controller + data subject rights).
const mailto = () => screen.getAllByRole('link', { name: 'beshtawi.ashraf@gmail.com' })[0];

describe('legal pages', () => {
  it('Impressum names the provider and a contact address', () => {
    render(<ImpressumPage />);
    expect(heading()).toHaveTextContent('Legal Notice (Impressum)');
    expect(screen.getByText(/Ashraf Beshtawi/)).toBeInTheDocument();
    expect(mailto()).toHaveAttribute('href', 'mailto:beshtawi.ashraf@gmail.com');
  });

  it('privacy policy names the hosting provider and links to account deletion', () => {
    render(<PrivacyPage />);
    expect(heading()).toHaveTextContent('Privacy Policy');
    expect(screen.getByText(/Contabo GmbH/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'delete your account' })).toHaveAttribute('href', '/delete-account');
    expect(mailto()).toBeInTheDocument();
  });

  it('privacy policy explains the YouTube API Services use and how to revoke access', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('link', { name: 'YouTube Terms of Service' })).toHaveAttribute('href', 'https://www.youtube.com/t/terms');
    expect(screen.getByRole('link', { name: 'Google Privacy Policy' })).toHaveAttribute('href', 'https://policies.google.com/privacy');
    expect(screen.getByRole('link', { name: 'Google security settings page' })).toHaveAttribute(
      'href',
      'https://myaccount.google.com/permissions'
    );
  });

  it('terms link to the privacy policy and account deletion', () => {
    render(<TermsPage />);
    expect(heading()).toHaveTextContent('Terms of Service');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'delete your account' })).toHaveAttribute('href', '/delete-account');
  });

  it('account deletion page points to the in-app flow', () => {
    render(<DeleteAccountPage />);
    expect(heading()).toHaveTextContent('Account löschen');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(mailto()).toBeInTheDocument();
  });
});
