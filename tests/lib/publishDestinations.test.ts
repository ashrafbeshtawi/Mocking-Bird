import { extractPublishDestinations } from '@/lib/publish/services/reportService';

describe('extractPublishDestinations', () => {
  beforeEach(() => jest.spyOn(console, 'info').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('keeps the warning of a successful destination for the history', () => {
    const destinations = extractPublishDestinations(
      [
        { platform: 'youtube', account_id: 'UC1', warning: 'The video was uploaded, but its thumbnail was not set.' },
        { platform: 'linkedin', account_id: 'li1' },
      ],
      []
    );

    expect(destinations).toEqual([
      { platform: 'youtube', account_id: 'UC1', success: true, warning: 'The video was uploaded, but its thumbnail was not set.' },
      { platform: 'linkedin', account_id: 'li1', success: true },
    ]);
  });
});
