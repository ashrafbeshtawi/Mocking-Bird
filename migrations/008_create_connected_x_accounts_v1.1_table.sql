CREATE TABLE connected_x_accounts_v1_1 (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    access_token_secret TEXT NOT NULL,
    x_user_id TEXT NOT NULL,
    screen_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON connected_x_accounts_v1_1
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();


ALTER TABLE connected_x_accounts_v1_1
ADD CONSTRAINT connected_x_accounts_v1_1_user_x_user_unique
UNIQUE (user_id, x_user_id);
