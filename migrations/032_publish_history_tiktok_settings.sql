-- The TikTok post settings the post was published with, so a retried upload keeps them.
ALTER TABLE publish_history ADD COLUMN IF NOT EXISTS tiktok_settings JSONB;
