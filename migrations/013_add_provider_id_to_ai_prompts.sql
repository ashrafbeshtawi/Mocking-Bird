-- Migration: Add provider_id to ai_prompts table
-- Links prompts to specific AI providers

ALTER TABLE ai_prompts
ADD COLUMN provider_id INTEGER REFERENCES ai_providers(id) ON DELETE SET NULL;

CREATE INDEX idx_ai_prompts_provider_id ON ai_prompts(provider_id);
