/** @jest-environment jsdom */
import { TextDecoder } from 'util';
import { renderHook, act } from '@testing-library/react';
import { usePublish } from '@/hooks/usePublish';

// jsdom ships no TextDecoder; the hook needs one to read the stream.
Object.assign(global, { TextDecoder });

const image = {
  publicId: 'i',
  publicUrl: 'https://cdn/i.jpg',
  resourceType: 'image' as const,
  format: 'jpg',
  originalFilename: 'i.jpg',
  previewUrl: '',
};
const video = { ...image, publicId: 'v', publicUrl: 'https://cdn/v.mp4', resourceType: 'video' as const, format: 'mp4' };

// The shape the hook reads from a streaming publish response: ok, and a body that ends at once.
const emptyStream = () => ({
  ok: true,
  body: { getReader: () => ({ read: async () => ({ done: true, value: undefined }) }) },
});

const sentBody = () => JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);

describe('usePublish destination filtering', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(emptyStream());
  });

  it('sends each platform its chosen part of a mixed post', async () => {
    const { result } = renderHook(() => usePublish());

    await act(() =>
      result.current.publish({
        postText: 'hello',
        uploadedMedia: [image, video],
        selectedFacebookPages: ['p1'],
        selectedXAccounts: ['x1'],
        selectedInstagramAccounts: { ig1: { publish: true, story: false } },
        selectedTelegramChannels: [],
        selectedLinkedInAccounts: [],
        selectedYouTubeChannels: [],
        contentSelection: { twitter: ['text', 'video'], instagram: ['text', 'image'] },
      })
    );

    const body = sentBody();
    expect(body.facebookPages).toEqual(['p1']);
    expect(body.xAccounts).toEqual(['x1']);
    expect(body.instagramPublishAccounts).toEqual(['ig1']);
    expect(body.contentSelection).toEqual({ twitter: ['text', 'video'], instagram: ['text', 'image'] });
  });

  it('leaves Instagram out of a text-only post without blocking the others', async () => {
    const { result } = renderHook(() => usePublish());

    await act(() =>
      result.current.publish({
        postText: 'text only',
        uploadedMedia: [],
        selectedFacebookPages: ['p1'],
        selectedXAccounts: [],
        selectedInstagramAccounts: { ig1: { publish: true, story: false } },
        selectedTelegramChannels: [],
        selectedLinkedInAccounts: [],
        selectedYouTubeChannels: [],
      })
    );

    const body = sentBody();
    expect(body.facebookPages).toEqual(['p1']);
    expect(body.instagramPublishAccounts).toEqual([]);
    expect(body.contentSelection).toEqual({});
  });

  it('refuses to publish while a selected X account has no choice made for a mixed post', async () => {
    const { result } = renderHook(() => usePublish());

    let ok = true;
    await act(async () => {
      ok = await result.current.publish({
        postText: 'hello',
        uploadedMedia: [image, video],
        selectedFacebookPages: ['p1'],
        selectedXAccounts: ['x1'],
        selectedInstagramAccounts: {},
        selectedTelegramChannels: [],
        selectedLinkedInAccounts: [],
        selectedYouTubeChannels: [],
      });
    });

    expect(ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.error?.message).toBe('Choose what to send to X.');
  });

  it('publishes once the undecided X account is unselected', async () => {
    const { result } = renderHook(() => usePublish());

    await act(() =>
      result.current.publish({
        postText: 'hello',
        uploadedMedia: [image, video],
        selectedFacebookPages: ['p1'],
        selectedXAccounts: [],
        selectedInstagramAccounts: {},
        selectedTelegramChannels: [],
        selectedLinkedInAccounts: [],
        selectedYouTubeChannels: [],
      })
    );

    expect(sentBody().facebookPages).toEqual(['p1']);
  });

  it('refuses to publish when no destination can take the post', async () => {
    const { result } = renderHook(() => usePublish());

    let ok = true;
    await act(async () => {
      ok = await result.current.publish({
        postText: 'text only',
        uploadedMedia: [],
        selectedFacebookPages: [],
        selectedXAccounts: [],
        selectedInstagramAccounts: { ig1: { publish: true, story: false } },
        selectedTelegramChannels: [],
        selectedLinkedInAccounts: [],
        selectedYouTubeChannels: [],
      });
    });

    expect(ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.error?.message).toMatch(/select at least one/i);
  });
});
