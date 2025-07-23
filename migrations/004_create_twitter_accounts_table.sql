CREATE TABLE twitter_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    x_access_token TEXT NOT NULL,
    x_access_token_secret TEXT NOT NULL
);
