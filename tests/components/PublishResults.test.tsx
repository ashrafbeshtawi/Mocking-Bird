/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { PublishResults } from '@/components/publish/PublishResults';

const none = { facebook: [], instagram: [], twitter: [], telegram: [], linkedin: [], youtube: [], tiktok: [] };
const accounts = {
  ...none,
  tiktok: [{ id: 'oid-1', name: 'Mocking Creator', platform: 'tiktok' as const }],
  twitter: [{ id: 'x-1', name: 'Mocking X', platform: 'twitter' as const }],
  instagram: [{ id: 'ig-1', name: 'Mocking Insta', platform: 'instagram' as const }],
};

describe('PublishResults', () => {
  it('names each result by its connected account, and falls back to the id', () => {
    render(
      <PublishResults
        error={{ message: 'Some destinations failed' }}
        success="Published to 2 destinations"
        accounts={accounts}
        results={{
          successful: [
            { platform: 'x', account_id: 'x-1' },
            { platform: 'instagram', instagram_account_id: 'ig-1', post_type: 'story' },
          ],
          failed: [
            { platform: 'tiktok', account_id: 'oid-1', error: { message: 'TikTok could not start the upload' } },
            { platform: 'telegram', telegram_channel_id: '-100123', error: { message: 'Bot was blocked' } },
          ],
        }}
      />
    );

    expect(screen.getByText('Mocking X')).toBeInTheDocument();
    expect(screen.getByText('Mocking Insta (Story)')).toBeInTheDocument();
    expect(screen.getByText('Mocking Creator')).toBeInTheDocument();
    expect(screen.getByText('-100123')).toBeInTheDocument();
  });
});
