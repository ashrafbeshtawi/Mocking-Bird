import { GET } from '@/app/api/cloudinary/config/route';

describe('GET /api/cloudinary/config', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('derives the cloud name from CLOUDINARY_URL and passes the preset through', async () => {
    process.env = {
      ...originalEnv,
      CLOUDINARY_URL: 'cloudinary://123456:s3cret@mycloud',
      CLOUDINARY_UPLOAD_PRESET: 'unsigned_preset',
    };

    expect(await (await GET()).json()).toEqual({ cloudName: 'mycloud', uploadPreset: 'unsigned_preset' });
  });

  it('does not care about the shape of the API key or extra URL parts', async () => {
    process.env = {
      ...originalEnv,
      CLOUDINARY_URL: 'cloudinary://abcKEY:s3cret@mycloud?secure=true',
      CLOUDINARY_UPLOAD_PRESET: 'unsigned_preset',
    };

    expect((await (await GET()).json()).cloudName).toBe('mycloud');
  });

  it('returns nulls when Cloudinary is not configured', async () => {
    process.env = { ...originalEnv, CLOUDINARY_URL: undefined, CLOUDINARY_UPLOAD_PRESET: undefined };

    expect(await (await GET()).json()).toEqual({ cloudName: null, uploadPreset: null });
  });
});
