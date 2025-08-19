CREATE TABLE ai_prompts_x_matching (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    x_account_id INTEGER REFERENCES connected_x_accounts(id) ON DELETE CASCADE,
    prompt_id INTEGER REFERENCES ai_prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);