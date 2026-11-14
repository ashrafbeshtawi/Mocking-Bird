jest.mock('@/lib/db', () => ({ __esModule: true, default: { query: jest.fn() } }));

jest.mock('@/lib/publish/validators/requestValidator', () => ({
  validateUserId: jest.fn(() => '42'),
  parsePublishRequest: jest.fn(),
  validateTextContent: jest.fn(() => ({ success: true })),
  validateAccountArrays: jest.fn(() => ({ success: true })),
  hasAnyDestination: jest.fn(() => true),
}));

jest.mock('@/lib/publish/validators/mediaValidator', () => ({
  processCloudinaryMedia: jest.fn(),
}));

jest.mock('@/lib/publish/services/tokenService', () => ({
  fetchAllTokens: jest.fn(async () => ({
    facebookTokens: [],
    twitterTokens: [],
    instagramFeedTokens: [],
    instagramStoryTokens: [],
    telegramTokens: [{ channel_id: 'c1', channel_title: 'Channel' }],
    linkedinTokens: [],
    youtubeTokens: [],
    tiktokTokens: [],
  })),
  validateMissingAccounts: jest.fn(() => ({})),
  formatMissingAccounts: jest.fn(() => []),
  hasMissingAccounts: jest.fn(() => false),
}));

jest.mock('@/lib/publish/services/reportService', () => ({
  createReportLogger: jest.fn(() => ({ add: jest.fn(), getReport: jest.fn(() => ['report']) })),
  savePublishReport: jest.fn(async () => undefined),
  determinePublishStatus: jest.fn(() => 'success'),
  extractPublishDestinations: jest.fn(() => [{ platform: 'telegram', account_id: 'c1', success: true }]),
}));

jest.mock('@/lib/publish/orchestrator', () => ({
  executePublishWithProgress: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/publish/stream/route';
import { parsePublishRequest } from '@/lib/publish/validators/requestValidator';
import { savePublishReport } from '@/lib/publish/services/reportService';
import { executePublishWithProgress, type ExecutePublishOptions } from '@/lib/publish/orchestrator';

const mockParse = parsePublishRequest as jest.Mock;
const mockSave = savePublishReport as jest.Mock;
const mockExecute = executePublishWithProgress as jest.Mock;

const parsedData = {
  text: 'hello',
  facebookPages: [],
  xAccounts: [],
  instagramPublishAccounts: [],
  instagramStoryAccounts: [],
  telegramChannels: ['c1'],
  linkedinAccounts: [],
  youtubeChannels: [],
  youtubeTitle: '',
  tiktokAccounts: [],
  tiktokSettings: null,
  cloudinaryMedia: [],
  contentSelection: undefined,
};

const request = () =>
  new NextRequest('http://localhost/api/publish/stream', {
    method: 'POST',
    headers: { 'x-user-id': '42' },
    body: JSON.stringify({ text: 'hello' }),
  });

const waitFor = async (check: () => boolean) => {
  for (let i = 0; i < 100 && !check(); i++) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }
};

const readAll = async (res: Response) => new TextDecoder().decode(await res.arrayBuffer());

describe('POST /api/publish/stream', () => {
  let unhandled: unknown[];
  const onUnhandled = (reason: unknown) => { unhandled.push(reason); };

  beforeEach(() => {
    jest.clearAllMocks();
    unhandled = [];
    process.on('unhandledRejection', onUnhandled);
    mockParse.mockResolvedValue({ success: true, data: parsedData });
  });

  afterEach(() => {
    process.off('unhandledRejection', onUnhandled);
  });

  it('still saves the publish history when the client disconnects mid-run', async () => {
    let publishFinished = false;
    mockExecute.mockImplementation(async ({ onAccountProgress }: ExecutePublishOptions) => {
      for (let i = 0; i < 5; i++) {
        await onAccountProgress?.([{ accountId: 'c1', accountName: 'Channel', platform: 'Telegram', status: 'publishing' }]);
      }
      publishFinished = true;
      return { successful: [{ platform: 'telegram', id: 'c1' }], failed: [] };
    });

    const res = await POST(request());
    const reader = res.body!.getReader();
    await reader.read();
    await reader.cancel();

    await waitFor(() => mockSave.mock.calls.length > 0);

    expect(publishFinished).toBe(true);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave.mock.calls[0][1]).toBe('42');
    expect(unhandled).toEqual([]);
  });

  it('sends the error and closes once on an early validation failure', async () => {
    mockParse.mockResolvedValue({ success: false, error: 'bad request' });

    const body = await readAll(await POST(request()));
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(body).toContain('event: error');
    expect(body).toContain('bad request');
    expect(mockExecute).not.toHaveBeenCalled();
    expect(unhandled).toEqual([]);
  });

  it('streams progress and the final result to a connected client', async () => {
    mockExecute.mockImplementation(async ({ onAccountProgress }: ExecutePublishOptions) => {
      await onAccountProgress?.([{ accountId: 'c1', accountName: 'Channel', platform: 'Telegram', status: 'completed' }]);
      return { successful: [{ platform: 'telegram', id: 'c1' }], failed: [] };
    });

    const body = await readAll(await POST(request()));

    expect(body).toContain('event: account_progress');
    expect(body).toContain('event: complete');
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
