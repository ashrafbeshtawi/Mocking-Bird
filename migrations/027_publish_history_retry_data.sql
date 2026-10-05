-- The post as it was published, so failed destinations can be retried:
-- the exact text and the Cloudinary media (CloudinaryMediaInfo[]).
-- Entries with post_text NULL have no retry data.

ALTER TABLE publish_history ADD COLUMN IF NOT EXISTS post_text TEXT;
ALTER TABLE publish_history ADD COLUMN IF NOT EXISTS media JSONB;
