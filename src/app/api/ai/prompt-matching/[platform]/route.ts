import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';

type Platform = 'facebook' | 'twitter' | 'instagram' | 'telegram';

interface PlatformConfig {
  table: string;
  accountIdColumn: string;
  accountTable: string;
  accountIdField: string;
  // For Instagram: lookup by external ID, then use internal ID
  externalIdField?: string;
}

const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  facebook: {
    table: 'ai_prompts_facebook_matching',
    accountIdColumn: 'page_id',
    accountTable: 'connected_facebook_pages',
    accountIdField: 'id',
    externalIdField: 'page_id', // Lookup by external page_id, use internal 'id' for matching
  },
  twitter: {
    table: 'ai_prompts_x_matching',
    accountIdColumn: 'x_account_id',
    accountTable: 'connected_x_accounts',
    accountIdField: 'id',
    externalIdField: 'x_user_id', // Lookup by external x_user_id, use internal 'id' for matching
  },
  instagram: {
    table: 'ai_prompts_instagram_matching',
    accountIdColumn: 'instagram_account_id',
    accountTable: 'connected_instagram_accounts',
    accountIdField: 'id',
    externalIdField: 'instagram_account_id', // Lookup by external instagram_account_id, use internal 'id' for matching
  },
  telegram: {
    table: 'ai_prompts_telegram_matching',
    accountIdColumn: 'telegram_channel_id',
    accountTable: 'connected_telegram_channels',
    accountIdField: 'id',
    externalIdField: 'channel_id', // Lookup by external channel_id, use internal 'id' for matching
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

    let query: string;

    // For Instagram, join to get the external account ID
    if (config.externalIdField) {
      query = `
        SELECT a.${config.externalIdField} as account_id, m.prompt_id, p.title as prompt_title, pr.name as provider_name
        FROM ${config.table} m
        JOIN ${config.accountTable} a ON m.${config.accountIdColumn} = a.id
        LEFT JOIN ai_prompts p ON m.prompt_id = p.id
        LEFT JOIN ai_providers pr ON p.provider_id = pr.id
        WHERE m.user_id = $1
      `;
    } else {
      query = `
        SELECT m.${config.accountIdColumn} as account_id, m.prompt_id, p.title as prompt_title, pr.name as provider_name
        FROM ${config.table} m
        LEFT JOIN ai_prompts p ON m.prompt_id = p.id
        LEFT JOIN ai_providers pr ON p.provider_id = pr.id
        WHERE m.user_id = $1
      `;
    }

    const { rows } = await client.query(query, [userId]);
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

    let internalAccountId = account_id;

    // For platforms with external IDs (like Instagram), look up the internal ID
    if (config.externalIdField) {
      const accountCheck = await client.query(
        `SELECT id FROM ${config.accountTable} WHERE ${config.externalIdField} = $1`,
        [account_id]
      );

      if (accountCheck.rowCount === 0) {
        client.release();
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      internalAccountId = accountCheck.rows[0].id;
    } else {
      // Verify the account exists
      const accountCheck = await client.query(
        `SELECT ${config.accountIdField} FROM ${config.accountTable} WHERE ${config.accountIdField} = $1`,
        [account_id]
      );

      if (accountCheck.rowCount === 0) {
        client.release();
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
    }

    // If prompt_id is null, delete the matching instead
    if (prompt_id === null || prompt_id === undefined) {
      await client.query(
        `DELETE FROM ${config.table} WHERE user_id = $1 AND ${config.accountIdColumn} = $2`,
        [userId, internalAccountId]
      );
      client.release();
      return NextResponse.json({ success: true, message: 'Matching removed successfully' });
    }

    // Upsert the matching
    await client.query(
      `INSERT INTO ${config.table} (user_id, ${config.accountIdColumn}, prompt_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, ${config.accountIdColumn})
       DO UPDATE SET prompt_id = $3`,
      [userId, internalAccountId, prompt_id]
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

    let internalAccountId = account_id;

    // For platforms with external IDs, look up the internal ID first
    if (config.externalIdField) {
      const accountCheck = await client.query(
        `SELECT id FROM ${config.accountTable} WHERE ${config.externalIdField} = $1`,
        [account_id]
      );

      if (accountCheck.rowCount === 0) {
        client.release();
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      internalAccountId = accountCheck.rows[0].id;
    }

    await client.query(
      `DELETE FROM ${config.table} WHERE user_id = $1 AND ${config.accountIdColumn} = $2`,
      [userId, internalAccountId]
    );
    client.release();

    return NextResponse.json({ success: true, message: 'Matching removed successfully' });
  } catch (error) {
    console.error(`API Error (DELETE /ai/prompt-matching/${platform}):`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
