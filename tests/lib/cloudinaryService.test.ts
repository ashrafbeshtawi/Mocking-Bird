jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload: jest.fn() },
  },
}));

import { v2 as cloudinary } from 'cloudinary';
import { ingestRemoteMedia } from '@/lib/services/cloudinaryService';

const mockUpload = cloudinary.uploader.upload as jest.Mock;

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
