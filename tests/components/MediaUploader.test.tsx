/** @jest-environment jsdom */
jest.mock('@/lib/cloudinary/clientUpload', () => ({
  getCloudinaryClientConfig: jest.fn(),
  uploadToCloudinaryClient: jest.fn(),
}));

import { render, screen } from '@testing-library/react';
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
});
