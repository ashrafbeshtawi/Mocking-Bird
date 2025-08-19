CREATE TABLE ai_prompts_facebook_matching (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    page_id INTEGER REFERENCES connected_facebook_pages(id) ON DELETE CASCADE,
    prompt_id INTEGER REFERENCES ai_prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);