jest.mock('axios');

import axios from 'axios';
import type { Pool } from 'pg';
import { FacebookPublisher, type FacebookPageToken } from '@/lib/publishers/facebook';
import type { MediaFile } from '@/types/interfaces';

const mockedAxios = axios as jest.Mocked<typeof axios>;

const page: FacebookPageToken = { page_id: 'p1', page_name: 'Ada Page', page_access_token: 'page-token' };

const video: MediaFile = {
  buffer: Buffer.from('video'),
  filename: 'launch.mp4',
  mimetype: 'video/mp4',
  thumbnailUrl: 'https://res.cloudinary.com/thumb1.jpg',
};

describe('FacebookPublisher video thumbnails', () => {
  const publisher = new FacebookPublisher({} as Pool);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockedAxios.get.mockResolvedValue({ data: new Uint8Array([9, 9]).buffer });
  });

  afterEach(() => jest.restoreAllMocks());

  const postTo = (suffix: string) => mockedAxios.post.mock.calls.find(([url]) => url.endsWith(suffix));

  it('makes the custom thumbnail the preferred one of the published video', async () => {
    mockedAxios.post.mockResolvedValue({ data: { id: 'v1' } });

    const { successful, failed } = await publisher.publishToPages({ text: 'Launch', files: [video] }, [page]);

    expect(failed).toEqual([]);
    expect(successful).toEqual([{ platform: 'facebook', page_id: 'p1', result: { video_posts: ['v1'] } }]);
    expect(mockedAxios.get).toHaveBeenCalledWith(video.thumbnailUrl, { responseType: 'arraybuffer' });
    const [, form, config] = postTo('/v1/thumbnails')!;
    expect(config).toMatchObject({ headers: { Authorization: 'Bearer page-token' } });
    const body = (form as { getBuffer: () => Buffer }).getBuffer().toString();
    expect(body).toMatch(/name="is_preferred"\r\n\r\ntrue/);
    expect(body).toMatch(/name="source"; filename="thumbnail.jpg"/);
  });

  it('keeps the published video and warns when the thumbnail is rejected', async () => {
    mockedAxios.post.mockImplementation(async (url: string) => {
      if (url.endsWith('/thumbnails')) throw new Error('Permissions error');
      return { data: { id: 'v1' } };
    });

    const { successful, failed } = await publisher.publishToPages({ text: 'Launch', files: [video] }, [page]);

    expect(failed).toEqual([]);
    expect(successful[0].warning).toBe('launch.mp4 was published, but its thumbnail was not set: Permissions error');
  });

  it('does not touch thumbnails for a video without one', async () => {
    mockedAxios.post.mockResolvedValue({ data: { id: 'v1' } });

    await publisher.publishToPages({ text: 'Launch', files: [{ ...video, thumbnailUrl: undefined }] }, [page]);

    expect(postTo('/thumbnails')).toBeUndefined();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
