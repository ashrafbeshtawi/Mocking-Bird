-- Migration: Create connected_telegram_channels table
-- This table stores Telegram channels connected by users
-- Note: Bot token is stored in environment variable, not per-user

CREATE TABLE IF NOT EXISTS connected_telegram_channels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_title TEXT NOT NULL,
    channel_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

CREATE INDEX idx_telegram_channels_user_id ON connected_telegram_channels(user_id);
