-- Migration: Create ai_prompts_telegram_matching table
-- Links Telegram channels to AI prompts for content transformation

CREATE TABLE ai_prompts_telegram_matching (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_channel_id INTEGER NOT NULL REFERENCES connected_telegram_channels(id) ON DELETE CASCADE,
    prompt_id INTEGER NOT NULL REFERENCES ai_prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, telegram_channel_id)
);

CREATE INDEX idx_ai_prompts_telegram_user ON ai_prompts_telegram_matching(user_id);
CREATE INDEX idx_ai_prompts_telegram_channel ON ai_prompts_telegram_matching(telegram_channel_id);
