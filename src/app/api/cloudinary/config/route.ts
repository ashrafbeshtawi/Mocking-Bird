import { NextResponse } from 'next/server';
import { getCloudinaryCloudName } from '@/lib/services/cloudinaryService';

// Browser uploads go straight to Cloudinary. The client fetches these values at
// runtime instead of having them inlined into the bundle at build time
// (NEXT_PUBLIC_*), so one image works for every environment.
export async function GET() {
  return NextResponse.json({
    cloudName: getCloudinaryCloudName(),
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET ?? null,
  });
}
