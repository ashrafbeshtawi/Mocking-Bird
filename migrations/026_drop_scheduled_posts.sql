-- Drops the publish queue table with its indexes.
-- Deletes any posts still waiting in it; their Cloudinary media is not removed.

DROP TABLE IF EXISTS scheduled_posts;
