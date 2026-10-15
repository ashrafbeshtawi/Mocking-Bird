/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/lib/fetch', () => ({ fetchWithAuth: jest.fn() }));

import { fetchWithAuth } from '@/lib/fetch';
import { TikTokSettingsField } from '@/components/publish/TikTokSettingsField';
import { EMPTY_TIKTOK_SETTINGS, type TikTokPostSettings } from '@/lib/tiktok';

const creator = {
  nickname: 'creator',
  privacyLevelOptions: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
  isCommentDisabled: false,
  isDuetDisabled: false,
  isStitchDisabled: false,
  maxVideoDurationSec: 600,
};
const suggestion: TikTokPostSettings = {
  privacyLevel: 'SELF_ONLY',
  allowComment: true,
  allowDuet: false,
  allowStitch: false,
  isYourBrand: true,
  isBrandedContent: false,
};

describe('TikTokSettingsField suggestion', () => {
  beforeEach(() => {
    (fetchWithAuth as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ creator }) });
  });

  it('offers the suggestion without presetting any field, and applies it on request', async () => {
    const onChange = jest.fn();
    render(
      <TikTokSettingsField
        accountIds={['oid-1']}
        value={EMPTY_TIKTOK_SETTINGS}
        onChange={onChange}
        onReadyChange={jest.fn()}
        suggestion={suggestion}
      />
    );

    expect(await screen.findByText(/Suggested by your assistant: Only me · Comments on · Duet off · Stitch off · Your brand/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Allow comments' })).not.toBeChecked();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChange).toHaveBeenCalledWith(suggestion);
  });

  it('hides the suggestion once the fields match it', async () => {
    render(
      <TikTokSettingsField accountIds={['oid-1']} value={suggestion} onChange={jest.fn()} onReadyChange={jest.fn()} suggestion={suggestion} />
    );

    await screen.findByText(/Posting to TikTok as creator/);
    expect(screen.queryByText(/Suggested by your assistant/)).not.toBeInTheDocument();
  });
});
