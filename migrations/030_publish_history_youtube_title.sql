-- The YouTube title the post was published with, so a retried upload keeps it.
ALTER TABLE publish_history ADD COLUMN IF NOT EXISTS youtube_title TEXT;
