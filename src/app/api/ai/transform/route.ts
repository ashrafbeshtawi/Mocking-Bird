import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { transformForDestination } from '@/lib/ai/transformService';

interface TransformRequest {
  text: string;
  destinations: Array<{
    platform: 'facebook' | 'twitter' | 'instagram' | 'telegram';
    account_id: string;
    account_name: string;
  }>;
}

interface TransformResult {
  platform: string;
  account_id: string;
  account_name: string;
  original_text: string;
  transformed_text: string | null;
  success: boolean;
  error?: string;
}

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { text, destinations }: TransformRequest = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return NextResponse.json({ error: 'destinations array is required' }, { status: 400 });
    }

    // Transform content for all destinations concurrently
    const transformPromises = destinations.map(async (dest): Promise<TransformResult> => {
      try {
        const transformed = await transformForDestination(
          parseInt(userId, 10),
          dest.platform,
          dest.account_id,
          text
        );

        return {
          platform: dest.platform,
          account_id: dest.account_id,
          account_name: dest.account_name,
          original_text: text,
          transformed_text: transformed,
          success: true,
        };
      } catch (error) {
        console.error(`Transform error for ${dest.platform}/${dest.account_id}:`, error);
        return {
          platform: dest.platform,
          account_id: dest.account_id,
          account_name: dest.account_name,
          original_text: text,
          transformed_text: null,
          success: false,
          error: (error as Error).message || 'Transformation failed',
        };
      }
    });

    const results = await Promise.all(transformPromises);

    const successCount = results.filter((r) => r.success && r.transformed_text !== null).length;
    const failureCount = results.filter((r) => !r.success || r.transformed_text === null).length;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        transformed: successCount,
        unchanged: results.filter((r) => r.success && r.transformed_text === null).length,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error('API Error (POST /ai/transform):', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to transform content' },
      { status: 500 }
    );
  }
}
