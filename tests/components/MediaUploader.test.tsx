/** @jest-environment jsdom */
jest.mock('@/lib/cloudinary/clientUpload', () => ({
  getCloudinaryClientConfig: jest.fn(),
  uploadToCloudinaryClient: jest.fn(),
}));

import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getCloudinaryClientConfig, uploadToCloudinaryClient } from '@/lib/cloudinary/clientUpload';
import { MediaUploader } from '@/components/publish/MediaUploader';

const mockConfig = getCloudinaryClientConfig as jest.Mock;
const mockUpload = uploadToCloudinaryClient as jest.Mock;

describe('MediaUploader', () => {
  it('shows a generic message without server configuration details when upload is unavailable', async () => {
    mockConfig.mockResolvedValue({ cloudName: null, uploadPreset: null });

    render(<MediaUploader uploadedMedia={[]} onMediaChange={jest.fn()} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/contact us/i);
    expect(alert.textContent).not.toMatch(/CLOUDINARY|env/i);
  });

  it('renders the upload control when configured', async () => {
    mockConfig.mockResolvedValue({ cloudName: 'mycloud', uploadPreset: 'preset' });

    render(<MediaUploader uploadedMedia={[]} onMediaChange={jest.fn()} />);

    expect(await screen.findByRole('button')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('opens a full-size preview of an uploaded image and closes it', async () => {
    mockConfig.mockResolvedValue({ cloudName: 'mycloud', uploadPreset: 'preset' });
    const user = userEvent.setup();
    const media = {
      publicId: 'p1',
      publicUrl: 'https://cdn/cat.jpg',
      resourceType: 'image' as const,
      format: 'jpg',
      originalFilename: 'cat.jpg',
      previewUrl: 'https://cdn/cat.jpg',
    };

    render(<MediaUploader uploadedMedia={[media]} onMediaChange={jest.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Preview cat.jpg' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'cat.jpg' })).toHaveAttribute('src', 'https://cdn/cat.jpg');

    await user.click(within(dialog).getByRole('button', { name: 'Close preview' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  describe('video thumbnails', () => {
    const video = {
      publicId: 'v1',
      publicUrl: 'https://cdn/launch.mp4',
      resourceType: 'video' as const,
      format: 'mp4',
      originalFilename: 'launch.mp4',
      previewUrl: 'https://cdn/launch.mp4',
    };
    const thumbnail = { publicId: 't1', publicUrl: 'https://cdn/t1.jpg' };
    const jpeg = (bytes = 10) => new File([new Uint8Array(bytes)], 'cover.jpg', { type: 'image/jpeg' });

    beforeEach(() => {
      jest.clearAllMocks();
      mockConfig.mockResolvedValue({ cloudName: 'mycloud', uploadPreset: 'preset' });
    });

    it('uploads a JPEG as the thumbnail of the video', async () => {
      const user = userEvent.setup();
      const onMediaChange = jest.fn();
      mockUpload.mockResolvedValue({ ...thumbnail, resourceType: 'image', format: 'jpg', originalFilename: 'cover.jpg' });
      render(<MediaUploader uploadedMedia={[video]} onMediaChange={onMediaChange} />);

      await screen.findByRole('button', { name: 'Add thumbnail for launch.mp4' });
      await user.upload(screen.getByTestId('thumbnail-input-v1'), jpeg());

      await waitFor(() => expect(onMediaChange).toHaveBeenCalledWith([{ ...video, thumbnail }]));
    });

    it.each([
      ['a PNG', new File(['x'], 'cover.png', { type: 'image/png' }), 'Thumbnails must be JPEG images.'],
      ['a JPEG over 2 MB', jpeg(2 * 1024 * 1024 + 1), 'Thumbnails can be at most 2 MB.'],
    ])('rejects %s without uploading it', async (_case, file, message) => {
      const user = userEvent.setup({ applyAccept: false });
      render(<MediaUploader uploadedMedia={[video]} onMediaChange={jest.fn()} />);

      await screen.findByRole('button', { name: 'Add thumbnail for launch.mp4' });
      await user.upload(screen.getByTestId('thumbnail-input-v1'), file);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('shows the thumbnail on the video and removes it on request', async () => {
      const user = userEvent.setup();
      const onMediaChange = jest.fn();
      const { container } = render(<MediaUploader uploadedMedia={[{ ...video, thumbnail }]} onMediaChange={onMediaChange} />);

      await user.click(await screen.findByRole('button', { name: 'Remove thumbnail for launch.mp4' }));

      expect(container.querySelector('video')).toHaveAttribute('poster', thumbnail.publicUrl);
      expect(screen.getByRole('button', { name: 'Replace thumbnail for launch.mp4' })).toBeInTheDocument();
      expect(onMediaChange).toHaveBeenCalledWith([{ ...video, thumbnail: undefined }]);
    });

    it('offers no thumbnail for an image', async () => {
      const image = { ...video, publicId: 'i1', resourceType: 'image' as const, originalFilename: 'cat.jpg' };
      render(<MediaUploader uploadedMedia={[image]} onMediaChange={jest.fn()} />);

      await screen.findByRole('button', { name: 'Preview cat.jpg' });
      expect(screen.queryByRole('button', { name: /thumbnail/ })).not.toBeInTheDocument();
    });
  });
});
