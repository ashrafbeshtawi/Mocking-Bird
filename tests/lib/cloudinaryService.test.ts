jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload: jest.fn(), destroy: jest.fn() },
  },
}));

import { v2 as cloudinary } from 'cloudinary';
import { ingestRemoteDraftMedia, ingestRemoteMedia } from '@/lib/services/cloudinaryService';

const mockUpload = cloudinary.uploader.upload as jest.Mock;
const mockDestroy = cloudinary.uploader.destroy as jest.Mock;

describe('ingestRemoteMedia', () => {
  beforeAll(() => {
    process.env.CLOUDINARY_URL = 'cloudinary://123456:secret@demo';
  });

  beforeEach(() => jest.clearAllMocks());

  it('uploads each URL to Cloudinary and returns draft-media shapes', async () => {
    mockUpload.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/img.jpg',
      public_id: 'mocking-bird/drafts/img',
      resource_type: 'image',
      format: 'jpg',
      width: 800,
      height: 600,
    });

    const result = await ingestRemoteMedia(['https://external.example/photo.jpg']);

    expect(result).toEqual([
      {
        publicUrl: 'https://res.cloudinary.com/demo/img.jpg',
        publicId: 'mocking-bird/drafts/img',
        resourceType: 'image',
        format: 'jpg',
        width: 800,
        height: 600,
        originalFilename: 'https://external.example/photo.jpg',
      },
    ]);
    expect(mockUpload).toHaveBeenCalledWith('https://external.example/photo.jpg', {
      resource_type: 'auto',
      folder: 'mocking-bird/drafts',
      type: 'upload',
    });
  });

  it('maps video uploads to the video resource type', async () => {
    mockUpload.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/clip.mp4',
      public_id: 'mocking-bird/drafts/clip',
      resource_type: 'video',
      format: 'mp4',
    });

    const [media] = await ingestRemoteMedia(['https://external.example/clip.mp4']);

    expect(media.resourceType).toBe('video');
  });

  it('fails naming the URL that could not be ingested', async () => {
    mockUpload.mockRejectedValue(new Error('404 Not Found'));

    await expect(ingestRemoteMedia(['https://gone.example/dead.jpg'])).rejects.toThrow(
      'Could not ingest media URL "https://gone.example/dead.jpg": 404 Not Found'
    );
  });
});

describe('ingestRemoteDraftMedia', () => {
  const video = { secure_url: 'https://res.cloudinary.com/demo/clip.mp4', public_id: 'mocking-bird/drafts/clip', resource_type: 'video', format: 'mp4' };
  const image = { secure_url: 'https://res.cloudinary.com/demo/img.jpg', public_id: 'mocking-bird/drafts/img', resource_type: 'image', format: 'jpg' };
  const thumbnail = { secure_url: 'https://res.cloudinary.com/demo/thumb.jpg', public_id: 'mocking-bird/drafts/thumb', resource_type: 'image', format: 'jpg', bytes: 50_000 };

  beforeAll(() => {
    process.env.CLOUDINARY_URL = 'cloudinary://123456:secret@demo';
  });

  beforeEach(() => jest.clearAllMocks());

  it('ingests a video thumbnail as a JPEG of at most 1280px and attaches it to the video', async () => {
    mockUpload.mockResolvedValueOnce(video).mockResolvedValueOnce(thumbnail);

    const [media] = await ingestRemoteDraftMedia([{ url: 'https://external.example/clip.mp4', thumbnail_url: 'https://external.example/cover.png' }]);

    expect(media.thumbnail).toEqual({ publicId: 'mocking-bird/drafts/thumb', publicUrl: 'https://res.cloudinary.com/demo/thumb.jpg' });
    expect(mockUpload).toHaveBeenLastCalledWith('https://external.example/cover.png', expect.objectContaining({
      resource_type: 'image',
      format: 'jpg',
      transformation: [{ width: 1280, height: 1280, crop: 'limit', quality: 'auto' }],
    }));
  });

  it('takes plain URLs and items without a thumbnail as before', async () => {
    mockUpload.mockResolvedValueOnce(image).mockResolvedValueOnce(video);

    const media = await ingestRemoteDraftMedia(['https://external.example/photo.jpg', { url: 'https://external.example/clip.mp4' }]);

    expect(media.map((m) => m.thumbnail)).toEqual([undefined, undefined]);
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it('rejects a thumbnail on an image', async () => {
    mockUpload.mockResolvedValueOnce(image);

    await expect(
      ingestRemoteDraftMedia([{ url: 'https://external.example/photo.jpg', thumbnail_url: 'https://external.example/cover.jpg' }])
    ).rejects.toThrow('thumbnail_url only applies to videos, and "https://external.example/photo.jpg" is an image.');
  });

  it('deletes and rejects a thumbnail that is still over 2 MB as a JPEG', async () => {
    mockUpload.mockResolvedValueOnce(video).mockResolvedValueOnce({ ...thumbnail, bytes: 3 * 1024 * 1024 });

    await expect(
      ingestRemoteDraftMedia([{ url: 'https://external.example/clip.mp4', thumbnail_url: 'https://external.example/huge.jpg' }])
    ).rejects.toThrow('larger than 2 MB');
    expect(mockDestroy).toHaveBeenCalledWith('mocking-bird/drafts/thumb', { resource_type: 'image' });
  });
});
