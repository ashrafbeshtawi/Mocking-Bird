// AI Provider and Prompt types

export interface AiProvider {
  id: number;
  name: string;
  base_url: string;
  model: string;
  created_at: string;
  updated_at: string;
  // api_key intentionally omitted for security - never sent to client
}

export interface AiProviderInput {
  name: string;
  api_key: string;
  base_url: string;
  model: string;
}

export interface AiPrompt {
  id: number;
  title: string;
  prompt: string;
  provider_id: number | null;
  provider_name?: string | null;
  created_at: string;
}

export interface AiPromptInput {
  title: string;
  prompt: string;
  provider_id?: number | null;
}

export interface PromptMatching {
  account_id: string | number;
  prompt_id: number | null;
  prompt_title?: string;
  provider_name?: string;
}

// Common base URLs for preset dropdown
export const COMMON_BASE_URLS = [
  { label: 'OpenAI', value: 'https://api.openai.com/v1' },
  { label: 'Anthropic (Claude)', value: 'https://api.anthropic.com/v1' },
  { label: 'Google (Gemini)', value: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { label: 'Ollama (local)', value: 'http://localhost:11434/v1' },
  { label: 'Custom', value: '' },
];
