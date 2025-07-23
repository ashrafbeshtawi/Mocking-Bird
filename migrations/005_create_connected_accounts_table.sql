CREATE TABLE connected_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    page_id TEXT NOT NULL,
    twitter_id TEXT NOT NULL
);
