import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { prompt_id, input } = await req.json();

    if (!prompt_id) {
      return NextResponse.json({ error: 'prompt_id is required' }, { status: 400 });
    }

    if (!input || typeof input !== 'string' || !input.trim()) {
      return NextResponse.json({ error: 'input is required' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      // Get the prompt with its provider
      const promptResult = await client.query(
        `SELECT p.id, p.prompt, p.provider_id, pr.api_key, pr.base_url, pr.model
         FROM ai_prompts p
         LEFT JOIN ai_providers pr ON p.provider_id = pr.id
         WHERE p.id = $1 AND p.user_id = $2`,
        [prompt_id, userId]
      );

      if (promptResult.rowCount === 0) {
        return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
      }

      const prompt = promptResult.rows[0];

      if (!prompt.provider_id || !prompt.api_key || !prompt.base_url || !prompt.model) {
        return NextResponse.json({ error: 'Prompt has no valid AI provider configured' }, { status: 400 });
      }

      // Combine the prompt template with user input
      const fullPrompt = `${prompt.prompt}\n\nContent to transform:\n${input.trim()}`;

      // Detect provider type and make appropriate API call
      const baseUrl = prompt.base_url.toLowerCase();
      let result: string;

      if (baseUrl.includes('generativelanguage.googleapis.com')) {
        // Gemini API
        const apiUrl = `${prompt.base_url}/models/${prompt.model}:generateContent?key=${prompt.api_key}`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Gemini API error');
        }

        const data = await response.json();
        result = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
      } else if (baseUrl.includes('api.mistral.ai')) {
        // Mistral API
        const response = await fetch(`${prompt.base_url}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${prompt.api_key}`,
          },
          body: JSON.stringify({
            model: prompt.model,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Mistral API error');
        }

        const data = await response.json();
        result = data.choices?.[0]?.message?.content || 'No response generated';
      } else {
        // OpenAI-compatible API (OpenAI, Claude, Ollama, etc.)
        const response = await fetch(`${prompt.base_url}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${prompt.api_key}`,
          },
          body: JSON.stringify({
            model: prompt.model,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'API error');
        }

        const data = await response.json();
        result = data.choices?.[0]?.message?.content || 'No response generated';
      }

      return NextResponse.json({ success: true, result });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('API Error (POST /ai/prompts/test):', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to test prompt' },
      { status: 500 }
    );
  }
}
