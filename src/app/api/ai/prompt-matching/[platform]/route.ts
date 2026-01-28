import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';

type Platform = 'facebook' | 'twitter' | 'instagram' | 'telegram';

const PLATFORM_CONFIG: Record<Platform, { table: string; accountIdColumn: string; accountTable: string; accountIdField: string }> = {
  facebook: {
    table: 'ai_prompts_facebook_matching',
    accountIdColumn: 'page_id',
    accountTable: 'connected_facebook_pages',
    accountIdField: 'id',
  },
  twitter: {
    table: 'ai_prompts_x_matching',
    accountIdColumn: 'x_account_id',
    accountTable: 'connected_x_accounts',
    accountIdField: 'id',
  },
  instagram: {
    table: 'ai_prompts_instagram_matching',
    accountIdColumn: 'instagram_account_id',
    accountTable: 'connected_instagram_accounts',
    accountIdField: 'id',
  },
  telegram: {
    table: 'ai_prompts_telegram_matching',
    accountIdColumn: 'telegram_channel_id',
    accountTable: 'connected_telegram_channels',
    accountIdField: 'id',
  },
};

const getUserId = async (): Promise<number | null> => {
  const userId = await getAuthUserId();
  const parsedUserId = userId ? parseInt(userId, 10) : null;
  return parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;
};

// GET: Get all prompt matchings for a platform
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { platform } = await params;
  const config = PLATFORM_CONFIG[platform as Platform];

  if (!config) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    const { rows } = await client.query(
      `SELECT m.${config.accountIdColumn} as account_id, m.prompt_id, p.title as prompt_title, pr.name as provider_name
       FROM ${config.table} m
       LEFT JOIN ai_prompts p ON m.prompt_id = p.id
       LEFT JOIN ai_providers pr ON p.provider_id = pr.id
       WHERE m.user_id = $1`,
      [userId]
    );
    client.release();

    return NextResponse.json({ success: true, matchings: rows });
  } catch (error) {
    console.error(`API Error (GET /ai/prompt-matching/${platform}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Set/update a prompt matching for an account
export async function POST(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { platform } = await params;
  const config = PLATFORM_CONFIG[platform as Platform];

  if (!config) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  try {
    const { account_id, prompt_id } = await req.json();

    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    const client = await pool.connect();

    // Verify the account belongs to the user
    const accountCheck = await client.query(
      `SELECT ${config.accountIdField} FROM ${config.accountTable} WHERE ${config.accountIdField} = $1`,
      [account_id]
    );

    if (accountCheck.rowCount === 0) {
      client.release();
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Upsert the matching
    await client.query(
      `INSERT INTO ${config.table} (user_id, ${config.accountIdColumn}, prompt_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, ${config.accountIdColumn})
       DO UPDATE SET prompt_id = $3`,
      [userId, account_id, prompt_id]
    );
    client.release();

    return NextResponse.json({ success: true, message: 'Matching saved successfully' });
  } catch (error) {
    console.error(`API Error (POST /ai/prompt-matching/${platform}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a prompt matching
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { platform } = await params;
  const config = PLATFORM_CONFIG[platform as Platform];

  if (!config) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  try {
    const { account_id } = await req.json();

    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    const client = await pool.connect();
    await client.query(
      `DELETE FROM ${config.table} WHERE user_id = $1 AND ${config.accountIdColumn} = $2`,
      [userId, account_id]
    );
    client.release();

    return NextResponse.json({ success: true, message: 'Matching removed successfully' });
  } catch (error) {
    console.error(`API Error (DELETE /ai/prompt-matching/${platform}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
