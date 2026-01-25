-- Create scheduled_posts table for queue post feature
CREATE TABLE scheduled_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]',
    destinations JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying by user and status
CREATE INDEX idx_scheduled_posts_user_status ON scheduled_posts(user_id, status);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
