/** @jest-environment jsdom */
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams('draft=7'),
}));
// One object for every render, as the real hook keeps its state between renders
const mockAccounts = {
  facebookPages: [{ page_id: 'p1', page_name: 'My Page' }],
  xAccounts: [],
  instagramAccounts: [{ id: 'ig1', username: 'insta' }],
  telegramChannels: [],
  linkedinAccounts: [],
  youtubeChannels: [],
  tiktokAccounts: [],
  normalizedAccounts: {
    facebook: [{ id: 'p1', name: 'My Page', platform: 'facebook' }],
    instagram: [{ id: 'ig1', name: 'insta', platform: 'instagram' }],
    twitter: [],
    telegram: [],
    linkedin: [],
    youtube: [],
    tiktok: [],
  },
  loading: false,
};
jest.mock('@/hooks/useConnectedAccounts', () => ({ useConnectedAccounts: () => mockAccounts }));
const mockPublishState = {
  isPublishing: false,
  error: null,
  success: null,
  results: null,
  statusMessage: '',
  stepProgress: null,
  accountsProgress: [],
  publish: jest.fn(),
  clearStatus: jest.fn(),
  silenceUpdates: jest.fn(),
};
jest.mock('@/hooks/usePublish', () => ({ usePublish: () => mockPublishState }));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PublishPage from '@/app/publish/page';

const draftTargets = [
  { platform: 'facebook', account_id: 'p1' },
  { platform: 'facebook', account_id: 'p9' },
  { platform: 'instagram', account_id: 'ig1', post_types: ['feed', 'story'] },
];

describe('Publish page with a draft', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          init?.method === 'PUT'
            ? { success: true, draft: { id: 7 } }
            : { draft: { id: 7, text: 'text only', media: null, target_accounts: draftTargets } },
      })
    );
    global.fetch = mockFetch;
  });

  it('keeps Instagram choices and disconnected targets of the draft when saving it', async () => {
    const user = userEvent.setup();
    render(<PublishPage />);

    const chip = await screen.findByText('Facebook · p9 (disconnected)');
    expect(chip.closest('.MuiChip-root')).toHaveClass('Mui-disabled');

    await user.click(screen.getByRole('button', { name: /Update Draft/ }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/drafts', expect.objectContaining({ method: 'PUT' })));
    const saveCall = mockFetch.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(JSON.parse(saveCall[1].body).target_accounts).toEqual([draftTargets[0], draftTargets[2], draftTargets[1]]);
  });
});
