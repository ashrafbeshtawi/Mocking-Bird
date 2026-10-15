/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSelector } from '@/components/publish/AccountSelector';

const noop = jest.fn();

const renderSelector = (props: Partial<React.ComponentProps<typeof AccountSelector>>) =>
  render(
    <AccountSelector
      facebookPages={[]}
      xAccounts={[{ id: 'x1', name: 'bird' }]}
      instagramAccounts={[{ id: 'ig1', username: 'insta', displayName: 'Insta', facebookPageId: 'p1' }]}
      telegramChannels={[]}
      linkedinAccounts={[]}
      youtubeChannels={[]}
      tiktokAccounts={[]}
      selectedFacebookPages={[]}
      selectedXAccounts={['x1']}
      selectedInstagramAccounts={{}}
      selectedTelegramChannels={[]}
      selectedLinkedInAccounts={[]}
      selectedYouTubeChannels={[]}
      selectedTikTokAccounts={[]}
      onFacebookChange={noop}
      onXChange={noop}
      onInstagramChange={noop}
      onTelegramChange={noop}
      onLinkedInChange={noop}
      onYouTubeChange={noop}
      onTikTokChange={noop}
      contentKinds={['text']}
      contentSelection={{}}
      onContentSelect={noop}
      {...props}
    />
  );

describe('AccountSelector content fit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets the user pick what X gets when the post mixes images and video', async () => {
    const user = userEvent.setup();
    const onContentSelect = jest.fn();
    renderSelector({ contentKinds: ['text', 'image', 'video'], onContentSelect });

    await user.click(screen.getByRole('button', { name: 'X: choose what to send' }));
    await user.click(screen.getByRole('menuitem', { name: 'Send text + video' }));

    expect(onContentSelect).toHaveBeenCalledWith('twitter', ['text', 'video']);
  });

  it('shows the chosen part of the post once picked', () => {
    renderSelector({ contentKinds: ['text', 'image', 'video'], contentSelection: { twitter: ['text', 'image'] } });

    expect(screen.getByText('text + images')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'X: choose what to send' })).not.toBeInTheDocument();
  });

  it('marks Instagram unsupported for a text-only post and disables its checkboxes', () => {
    renderSelector({ contentKinds: ['text'] });

    expect(screen.getByLabelText('Instagram: unsupported content')).toBeInTheDocument();
    screen.getAllByRole('checkbox').forEach((box) => {
      if (box.closest('li')?.textContent?.includes('@insta')) expect(box).toBeDisabled();
    });
  });
});
