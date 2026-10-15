CREATE TABLE connected_tiktok_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    open_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT connected_tiktok_accounts_user_open_id_unique UNIQUE (user_id, open_id)
);

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON connected_tiktok_accounts
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();
