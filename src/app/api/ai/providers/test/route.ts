import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';

// Helper to detect provider type from base_url
function getProviderType(baseUrl: string): 'gemini' | 'mistral' | 'openai-compatible' {
  if (baseUrl.includes('generativelanguage.googleapis.com')) {
    return 'gemini';
  }
  if (baseUrl.includes('api.mistral.ai')) {
    return 'mistral';
  }
  return 'openai-compatible';
}

// Test Gemini API connection
async function testGeminiConnection(apiKey: string, model: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: 'Say "Connection successful!" in exactly those words.' }]
      }]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API returned ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      if (errorText.length < 200) {
        errorMessage = errorText;
      }
    }
    return { success: false, error: errorMessage };
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    return { success: false, error: 'No response from model' };
  }

  return { success: true, message: 'Connection successful', response: content.trim() };
}

// Test Mistral API connection
async function testMistralConnection(apiKey: string, model: string) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: 'Say "Connection successful!" in exactly those words.' },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API returned ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      if (errorText.length < 200) {
        errorMessage = errorText;
      }
    }
    return { success: false, error: errorMessage };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return { success: false, error: 'No response from model' };
  }

  return { success: true, message: 'Connection successful', response: content.trim() };
}

// Test OpenAI-compatible API connection
async function testOpenAICompatibleConnection(apiKey: string, baseUrl: string, model: string) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: 'Say "Connection successful!" in exactly those words.' },
      ],
      max_tokens: 20,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API returned ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      if (errorText.length < 200) {
        errorMessage = errorText;
      }
    }
    return { success: false, error: errorMessage };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return { success: false, error: 'No response from model' };
  }

  return { success: true, message: 'Connection successful', response: content.trim() };
}

// POST: Test a provider connection
export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { api_key, base_url, model } = await req.json();

    if (!api_key || !base_url || !model) {
      return NextResponse.json({ error: 'api_key, base_url, and model are required' }, { status: 400 });
    }

    const providerType = getProviderType(base_url);
    let result;

    switch (providerType) {
      case 'gemini':
        result = await testGeminiConnection(api_key, model);
        break;
      case 'mistral':
        result = await testMistralConnection(api_key, model);
        break;
      default:
        result = await testOpenAICompatibleConnection(api_key, base_url, model);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}
