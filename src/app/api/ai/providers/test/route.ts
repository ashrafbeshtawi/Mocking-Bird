import { NextRequest, NextResponse } from 'next/server';

// POST: Test a provider connection
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { api_key, base_url, model } = await req.json();

    if (!api_key || !base_url || !model) {
      return NextResponse.json({ error: 'api_key, base_url, and model are required' }, { status: 400 });
    }

    // Make a simple test request to the provider
    const response = await fetch(`${base_url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api_key}`,
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
      return NextResponse.json({ success: false, error: errorMessage }, { status: 200 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ success: false, error: 'No response from model' }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: 'Connection successful', response: content.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}
