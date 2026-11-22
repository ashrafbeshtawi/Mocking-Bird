-- Pending Telegram channel verifications: the code a user must post in the channel
-- before it is connected. chat_id is the numeric id from getChat, matched against the
-- chat of incoming channel posts. verified_at is set once the code post is seen, so a
-- post read (and confirmed) by another user's check still counts.
CREATE TABLE IF NOT EXISTS telegram_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    chat_id BIGINT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_verifications_code ON telegram_verifications(code);
