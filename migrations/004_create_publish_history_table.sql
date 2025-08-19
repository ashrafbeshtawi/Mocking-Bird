CREATE TABLE publish_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    successful_twitter TEXT[] DEFAULT ARRAY[]::TEXT[],
    successful_facebook TEXT[] DEFAULT ARRAY[]::TEXT[],
    failed_twitter TEXT[] DEFAULT ARRAY[]::TEXT[],
    failed_facebook TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);