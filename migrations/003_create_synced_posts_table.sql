CREATE TABLE synced_posts (
    synced_posts_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    page_id TEXT NOT NULL,
    twitter_id TEXT NOT NULL
);
