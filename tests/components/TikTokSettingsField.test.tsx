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

describe('TikTokSettingsField branded content visibility', () => {
  beforeEach(() => {
    (fetchWithAuth as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ creator }) });
  });

  const renderField = (value: TikTokPostSettings, onChange = jest.fn()) =>
    render(<TikTokSettingsField accountIds={['oid-1']} value={value} onChange={onChange} onReadyChange={jest.fn()} />);

  it('disables branded content for a private post and says why on hover', async () => {
    renderField({ ...EMPTY_TIKTOK_SETTINGS, privacyLevel: 'SELF_ONLY', isYourBrand: true });

    const branded = await screen.findByRole('checkbox', { name: /Branded content/ });
    expect(branded).toBeDisabled();
    expect(screen.getByText(/Branded content cannot be private/)).toBeInTheDocument();

    fireEvent.mouseOver(branded);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Branded content visibility cannot be set to private.');
  });

  it('keeps branded content enabled while it is checked on a private post, so it can be unchecked', async () => {
    renderField({ ...EMPTY_TIKTOK_SETTINGS, privacyLevel: 'SELF_ONLY', isBrandedContent: true });

    expect(await screen.findByRole('checkbox', { name: /Branded content/ })).toBeEnabled();
  });

  it('disables "Only me" for branded content, says why on hover and ignores a click on it', async () => {
    const onChange = jest.fn();
    renderField({ ...EMPTY_TIKTOK_SETTINGS, privacyLevel: 'PUBLIC_TO_EVERYONE', isBrandedContent: true }, onChange);

    fireEvent.mouseDown(await screen.findByRole('combobox'));
    const onlyMe = screen.getByRole('option', { name: /Only me/ });
    expect(onlyMe).toHaveAttribute('aria-disabled', 'true');

    fireEvent.mouseOver(screen.getByText(/Only me/));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Branded content visibility cannot be set to private.');

    fireEvent.click(onlyMe);
    expect(onChange).not.toHaveBeenCalled();
  });
});
