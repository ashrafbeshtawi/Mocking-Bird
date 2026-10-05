/** @jest-environment jsdom */
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/hooks/useConnectedAccounts', () => ({
  useConnectedAccounts: () => ({
    normalizedAccounts: {
      facebook: [{ id: 'fb1', name: 'My Page', platform: 'facebook' }],
      instagram: [],
      twitter: [{ id: 'x1', name: 'ByteSizedAINews', platform: 'twitter' }],
      telegram: [{ id: 'tg1', name: 'News Channel', platform: 'telegram' }],
    },
  }),
}));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PublishHistoryPage from '@/app/history/page';

const entry = {
  id: 99,
  content: 'hello world',
  publish_status: 'partial_success',
  publish_report: 'report',
  created_at: '2026-10-05T10:00:00Z',
  retryable: true,
  publish_destinations: [
    { platform: 'facebook', account_id: 'fb1', success: true },
    { platform: 'twitter', account_id: 'x1', success: false, error: 'CreditsDepleted: no credits' },
    { platform: 'telegram', account_id: 'tg1', success: false, error: 'Bot was blocked' },
  ],
};

const historyResponse = (items: object[]) => ({
  ok: true,
  json: async () => ({ success: true, page: 1, limit: 10, total: items.length, totalPages: 1, history: items }),
});

const mockFetch = jest.fn();

const retryCalls = () =>
  mockFetch.mock.calls.filter(([url]) => url === '/api/publish/retry').map(([, init]) => JSON.parse(init.body));

async function openEntry(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByLabelText('Show details of post 99'));
  return screen.getAllByTestId('history-destination');
}

describe('History retry', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('lists each destination with its account, outcome and error', async () => {
    mockFetch.mockResolvedValue(historyResponse([entry]));
    const user = userEvent.setup();
    render(<PublishHistoryPage />);

    const rows = await openEntry(user);

    expect(rows.map((r) => r.textContent)).toEqual([
      'My Page',
      expect.stringContaining('ByteSizedAINews'),
      expect.stringContaining('News Channel'),
    ]);
    expect(rows[1]).toHaveTextContent('CreditsDepleted: no credits');
    expect(within(rows[0]).queryByRole('button', { name: /Retry/ })).toBeNull();
  });

  it('retries one failed destination and shows its new outcome', async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/api/publish/retry'
          ? {
              ok: true,
              json: async () => ({
                success: true,
                publish_status: 'partial_success',
                retried: 1,
                succeeded: 1,
                publish_destinations: [entry.publish_destinations[0], entry.publish_destinations[1], { platform: 'telegram', account_id: 'tg1', success: true }],
              }),
            }
          : historyResponse([entry])
      )
    );
    const user = userEvent.setup();
    render(<PublishHistoryPage />);
    const rows = await openEntry(user);

    await user.click(within(rows[2]).getByRole('button', { name: 'Retry News Channel' }));

    await waitFor(() =>
      expect(retryCalls()).toEqual([{ historyId: 99, destinations: [{ platform: 'telegram', account_id: 'tg1' }] }])
    );
    expect(await screen.findByText('1 of 1 destination published')).toBeInTheDocument();
    expect(within(screen.getAllByTestId('history-destination')[2]).queryByRole('button', { name: /Retry/ })).toBeNull();
  });

  it('retries all failed destinations of an entry at once', async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/api/publish/retry'
          ? { ok: true, json: async () => ({ success: true, publish_status: 'partial_success', retried: 2, succeeded: 1, publish_destinations: entry.publish_destinations }) }
          : historyResponse([entry])
      )
    );
    const user = userEvent.setup();
    render(<PublishHistoryPage />);

    await user.click(await screen.findByLabelText('Retry all failed destinations of post 99'));

    await waitFor(() => expect(retryCalls()).toEqual([{ historyId: 99 }]));
    expect(await screen.findByText('1 of 2 destinations published')).toBeInTheDocument();
  });

  it('disables retry for an entry without a stored post', async () => {
    mockFetch.mockResolvedValue(historyResponse([{ ...entry, retryable: false }]));
    const user = userEvent.setup();
    render(<PublishHistoryPage />);

    expect(await screen.findByLabelText('Retry all failed destinations of post 99')).toBeDisabled();
    const rows = await openEntry(user);
    expect(within(rows[1]).getByRole('button', { name: 'Retry ByteSizedAINews' })).toBeDisabled();
  });
});
