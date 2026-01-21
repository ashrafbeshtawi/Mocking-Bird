import pool from '@/lib/db';

interface TransformResult {
  success: boolean;
  content?: string;
  error?: string;
}

interface ProviderConfig {
  api_key: string;
  base_url: string;
  model: string;
}

interface PromptConfig {
  id: number;
  prompt: string;
  provider_id: number;
}

export async function getPromptForDestination(
  userId: number,
  platform: 'facebook' | 'twitter' | 'instagram' | 'telegram',
  accountId: string | number
): Promise<{ prompt: PromptConfig; provider: ProviderConfig } | null> {
  const tableMap = {
    facebook: { table: 'ai_prompts_facebook_matching', column: 'page_id' },
    twitter: { table: 'ai_prompts_x_matching', column: 'x_account_id' },
    instagram: { table: 'ai_prompts_instagram_matching', column: 'instagram_account_id' },
    telegram: { table: 'ai_prompts_telegram_matching', column: 'telegram_channel_id' },
  };

  const config = tableMap[platform];
  if (!config) return null;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT p.id, p.prompt, p.provider_id, pr.api_key, pr.base_url, pr.model
       FROM ${config.table} m
       JOIN ai_prompts p ON m.prompt_id = p.id
       JOIN ai_providers pr ON p.provider_id = pr.id
       WHERE m.user_id = $1 AND m.${config.column} = $2 AND p.provider_id IS NOT NULL`,
      [userId, accountId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      prompt: { id: row.id, prompt: row.prompt, provider_id: row.provider_id },
      provider: { api_key: row.api_key, base_url: row.base_url, model: row.model },
    };
  } finally {
    client.release();
  }
}

export async function transformContent(
  content: string,
  promptText: string,
  provider: ProviderConfig
): Promise<TransformResult> {
  try {
    const response = await fetch(`${provider.base_url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.api_key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: promptText },
          { role: 'user', content: content },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const transformedContent = data.choices?.[0]?.message?.content;

    if (!transformedContent) {
      return { success: false, error: 'No content in API response' };
    }

    return { success: true, content: transformedContent.trim() };
  } catch (error) {
    return { success: false, error: `Transform failed: ${(error as Error).message}` };
  }
}
