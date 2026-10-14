CREATE TABLE connected_youtube_channels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT connected_youtube_channels_user_channel_unique UNIQUE (user_id, channel_id)
);

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON connected_youtube_channels
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();
