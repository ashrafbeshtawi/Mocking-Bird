/** @jest-environment jsdom */
jest.mock('@/lib/cloudinary/clientUpload', () => ({
  getCloudinaryClientConfig: jest.fn(),
  uploadToCloudinaryClient: jest.fn(),
}));

import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getCloudinaryClientConfig } from '@/lib/cloudinary/clientUpload';
import { MediaUploader } from '@/components/publish/MediaUploader';

const mockConfig = getCloudinaryClientConfig as jest.Mock;

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
});
