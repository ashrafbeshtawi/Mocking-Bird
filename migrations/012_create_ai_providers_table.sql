-- Migration: Create ai_providers table
-- Replaces openai_api_keys with a multi-provider system

CREATE TABLE ai_providers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    api_key TEXT NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    model VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_providers_user_id ON ai_providers(user_id);

CREATE TRIGGER set_ai_providers_updated_at
BEFORE UPDATE ON ai_providers
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();

-- Migrate existing OpenAI keys to new table
INSERT INTO ai_providers (user_id, name, api_key, base_url, model, created_at, updated_at)
SELECT
    user_id,
    'OpenAI (migrated)',
    api_key,
    'https://api.openai.com/v1',
    'gpt-4o',
    created_at,
    updated_at
FROM openai_api_keys;
