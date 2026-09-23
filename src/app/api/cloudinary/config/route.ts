import { NextResponse } from 'next/server';
import { getCloudinaryCloudName } from '@/lib/services/cloudinaryService';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CloudinaryConfig');

// Browser uploads go straight to Cloudinary. The client fetches these values at
// runtime instead of having them inlined into the bundle at build time
// (NEXT_PUBLIC_*), so one image works for every environment.
export async function GET() {
  const cloudName = getCloudinaryCloudName();
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? null;

  if (!cloudName || !uploadPreset) {
    logger.warn('Browser media upload disabled: set CLOUDINARY_URL and CLOUDINARY_UPLOAD_PRESET');
  }

  return NextResponse.json({ cloudName, uploadPreset });
}
