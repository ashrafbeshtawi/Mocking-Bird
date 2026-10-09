CREATE TABLE connected_linkedin_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    linkedin_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    access_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT connected_linkedin_accounts_user_linkedin_user_unique UNIQUE (user_id, linkedin_user_id)
);

CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON connected_linkedin_accounts
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();
