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

  describe('media count limits', () => {
    const clip = (id: string) => ({ publicId: id, publicUrl: `https://cdn/${id}.mp4`, resourceType: 'video' as const, originalFilename: `${id}.mp4` });
    const youtubeProps: Partial<React.ComponentProps<typeof AccountSelector>> = {
      xAccounts: [],
      instagramAccounts: [],
      youtubeChannels: [{ id: 'yt1', name: 'Channel' }],
      selectedXAccounts: [],
      selectedYouTubeChannels: ['yt1'],
      contentKinds: ['text', 'video'],
      contentMedia: [clip('v1'), clip('v2')],
    };

    it('lets the user pick which video goes to YouTube', async () => {
      const user = userEvent.setup();
      const onMediaSelect = jest.fn();
      const onYouTubeChange = jest.fn();
      renderSelector({ ...youtubeProps, onMediaSelect, onYouTubeChange });

      await user.click(screen.getByRole('button', { name: 'YouTube: choose what to send' }));
      await user.click(screen.getByRole('menuitem', { name: /choose which media/i }));
      // The chooser starts from the first video; switch to the second.
      await user.click(screen.getByRole('checkbox', { name: 'Send v1.mp4' }));
      await user.click(screen.getByRole('checkbox', { name: 'Send v2.mp4' }));
      await user.click(screen.getByRole('button', { name: 'Send 1 of 2' }));

      expect(onMediaSelect).toHaveBeenCalledWith('youtube', ['v2']);
      // Clicks inside the chooser must not toggle the YouTube row.
      expect(onYouTubeChange).not.toHaveBeenCalled();
    });

    it('shows the pick once made', () => {
      renderSelector({ ...youtubeProps, onMediaSelect: jest.fn(), mediaSelection: { youtube: ['v2'] } });

      expect(screen.getByText('1 of 2 media')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'YouTube: choose what to send' })).not.toBeInTheDocument();
    });

    it('keeps the old unsupported badge without a media chooser', () => {
      renderSelector(youtubeProps);

      expect(screen.getByLabelText('YouTube: unsupported content')).toBeInTheDocument();
    });
  });

  it('marks Instagram unsupported for a text-only post and disables its checkboxes', () => {
    renderSelector({ contentKinds: ['text'] });

    expect(screen.getByLabelText('Instagram: unsupported content')).toBeInTheDocument();
    screen.getAllByRole('checkbox').forEach((box) => {
      if (box.closest('li')?.textContent?.includes('@insta')) expect(box).toBeDisabled();
    });
  });
});
