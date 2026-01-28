-- Add composite index for efficient user analytics queries
-- This speeds up queries that filter by user_id and sort by created_at

CREATE INDEX CONCURRENTLY idx_publish_history_user_created
ON publish_history(user_id, created_at DESC);
