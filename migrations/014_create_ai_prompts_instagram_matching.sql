-- Migration: Create ai_prompts_instagram_matching table
-- Links Instagram accounts to AI prompts for content transformation

CREATE TABLE ai_prompts_instagram_matching (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_account_id INTEGER NOT NULL REFERENCES connected_instagram_accounts(id) ON DELETE CASCADE,
    prompt_id INTEGER NOT NULL REFERENCES ai_prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, instagram_account_id)
);

CREATE INDEX idx_ai_prompts_instagram_user ON ai_prompts_instagram_matching(user_id);
CREATE INDEX idx_ai_prompts_instagram_account ON ai_prompts_instagram_matching(instagram_account_id);
