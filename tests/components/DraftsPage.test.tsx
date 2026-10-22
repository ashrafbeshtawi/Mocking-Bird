/** @jest-environment jsdom */
const mockPush = jest.fn();
let mockSearch = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearch,
}));
jest.mock('@/lib/fetch', () => ({ fetchWithAuth: jest.fn() }));
jest.mock('@/hooks/useConnectedAccounts', () => ({
  useConnectedAccounts: () => ({
    facebookPages: [{ page_id: 'p1', page_name: 'My Page' }],
    xAccounts: [],
    instagramAccounts: [{ id: 'ig1', username: 'insta' }],
    telegramChannels: [],
    normalizedAccounts: { facebook: [{ id: 'p1', name: 'My Page', platform: 'facebook' }] },
  }),
}));
let mockPublishState: Record<string, unknown> = {};
const mockPublish = jest.fn();
jest.mock('@/hooks/usePublish', () => ({
  usePublish: () => ({
    publish: mockPublish,
    isPublishing: false,
    statusMessage: '',
    error: null,
    success: null,
    results: null,
    clearStatus: jest.fn(),
    ...mockPublishState,
  }),
}));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchWithAuth } from '@/lib/fetch';
import DraftsPage from '@/app/drafts/page';

const mockFetch = fetchWithAuth as jest.Mock;

const draft = (id: number, text: string) => ({
  id,
  text,
  target_accounts: [{ platform: 'facebook', account_id: 'p1' }],
  target_platforms: ['facebook'],
  media: null,
  created_at: '2026-09-30T10:00:00Z',
  updated_at: '2026-09-30T10:00:00Z',
});

const listResponse = (drafts: unknown[], total = drafts.length) => ({
  ok: true,
  json: async () => ({ success: true, drafts, total, limit: 20, offset: 0 }),
});

const lastListUrl = () =>
  mockFetch.mock.calls.map(([url]) => url as string).filter((url) => url.startsWith('/api/drafts?')).pop()!;

describe('Drafts page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = new URLSearchParams();
    mockPublishState = {};
    mockFetch.mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'DELETE'
          ? { ok: true, json: async () => ({ success: true, deletedCount: JSON.parse(init.body as string).ids.length }) }
          : listResponse([draft(1, 'first draft'), draft(2, 'second draft'), draft(3, 'third draft')])
      )
    );
  });

  it('loads the first page of drafts', async () => {
    render(<DraftsPage />);

    expect(await screen.findByText('first draft')).toBeInTheDocument();
    expect(lastListUrl()).toBe('/api/drafts?limit=20&offset=0');
  });

  it('bulk-deletes the selected drafts after confirmation', async () => {
    const user = userEvent.setup();
    render(<DraftsPage />);
    await screen.findByText('first draft');

    await user.click(screen.getByLabelText('Select draft 1'));
    await user.click(screen.getByLabelText('Select draft 3'));
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete 2' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete 2 drafts?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete 2' }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/drafts', { method: 'DELETE', body: JSON.stringify({ ids: [1, 3] }) })
    );
    expect(await screen.findByText('2 drafts deleted')).toBeInTheDocument();
  });

  it('select all selects every draft on the page', async () => {
    const user = userEvent.setup();
    render(<DraftsPage />);
    await screen.findByText('first draft');

    await user.click(screen.getByLabelText('Select all drafts on this page'));

    expect(screen.getByText('3 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete 3' })).toBeInTheDocument();
  });

  it('writes the search to the URL, which drives the list request', async () => {
    const user = userEvent.setup();
    render(<DraftsPage />);
    await screen.findByText('first draft');

    await user.type(screen.getByLabelText('Search drafts'), 'launch');

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/drafts?q=launch', { scroll: false }));
  });

  it('requests the filtered page given by the URL', async () => {
    mockSearch = new URLSearchParams('page=2&q=launch&platform=telegram');
    mockFetch.mockResolvedValue(listResponse([draft(21, 'launch post')], 21));
    render(<DraftsPage />);

    expect(await screen.findByText('launch post')).toBeInTheDocument();
    expect(lastListUrl()).toBe('/api/drafts?limit=20&offset=20&q=launch&platform=telegram');
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('shows a no-match state when filters exclude everything', async () => {
    mockSearch = new URLSearchParams('q=nothing');
    mockFetch.mockResolvedValue(listResponse([]));
    render(<DraftsPage />);

    expect(await screen.findByText('No drafts match')).toBeInTheDocument();
  });

  it('shows the per-account errors when publishing a draft fails', async () => {
    mockPublish.mockResolvedValue(false);
    mockPublishState = {
      error: { message: 'All posts failed to publish' },
      results: {
        successful: [],
        failed: [{ platform: 'facebook', page_id: 'p1', error: { message: 'Token expired', code: '190' } }],
      },
    };
    render(<DraftsPage />);
    await screen.findByText('first draft');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('My Page')).toBeInTheDocument();
    expect(within(dialog).getByText(/Token expired/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Code: 190/)).toBeInTheDocument();
  });

  it('publishes a draft to its target accounts and keeps it when publishing fails', async () => {
    mockPublish.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<DraftsPage />);
    await screen.findByText('first draft');

    await user.click(screen.getAllByTitle('Publish draft')[0]);
    await user.click(await screen.findByRole('button', { name: 'Publish to 1 destination' }));

    await waitFor(() =>
      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({ postText: 'first draft', selectedFacebookPages: ['p1'] })
      )
    );
    expect(mockFetch).not.toHaveBeenCalledWith('/api/drafts', expect.objectContaining({ method: 'DELETE' }));
  });

  it('shows disconnected targets as disabled and publishes Instagram stories the draft targets', async () => {
    mockPublish.mockResolvedValue(false);
    mockFetch.mockResolvedValue(
      listResponse([
        {
          ...draft(1, 'story draft'),
          media: [{ publicUrl: 'https://cdn/cat.jpg', resourceType: 'image' }],
          target_accounts: [
            { platform: 'facebook', account_id: 'p1' },
            { platform: 'facebook', account_id: 'p9' },
            { platform: 'instagram', account_id: 'ig1', post_types: ['story'] },
          ],
          target_platforms: ['facebook', 'instagram'],
        },
      ])
    );
    const user = userEvent.setup();
    render(<DraftsPage />);
    await screen.findByText('story draft');

    await user.click(screen.getByTitle('Publish draft'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('p9 (disconnected)').closest('.MuiChip-root')).toHaveClass('Mui-disabled');
    await user.click(within(dialog).getByRole('button', { name: /^Publish to/ }));

    await waitFor(() =>
      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedFacebookPages: ['p1'],
          selectedInstagramAccounts: { ig1: { publish: false, story: true } },
        })
      )
    );
  });

  it('previews a draft image full size from the publish dialog', async () => {
    mockFetch.mockResolvedValue(
      listResponse([
        { ...draft(1, 'with media'), media: [{ publicUrl: 'https://cdn/cat.jpg', resourceType: 'image', originalFilename: 'cat.jpg' }] },
      ])
    );
    const user = userEvent.setup();
    render(<DraftsPage />);
    await screen.findByText('with media');

    await user.click(screen.getByTitle('Publish draft'));
    await user.click(await screen.findByRole('button', { name: 'Preview cat.jpg' }));

    const preview = screen.getAllByRole('dialog').pop()!;
    expect(within(preview).getByRole('img', { name: 'cat.jpg' })).toHaveAttribute('src', 'https://cdn/cat.jpg');
  });
});
