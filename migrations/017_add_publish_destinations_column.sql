-- Add publish_destinations column to store the list of platforms/accounts published to
-- This replaces the need to parse publish_report text for platform information

ALTER TABLE publish_history
ADD COLUMN publish_destinations JSONB DEFAULT '[]'::jsonb;

-- Create an index for efficient querying by platform
CREATE INDEX idx_publish_history_destinations ON publish_history USING GIN (publish_destinations);

-- Comment explaining the column structure
COMMENT ON COLUMN publish_history.publish_destinations IS
'JSON array of destination objects. Each object contains: platform (string), account_id (string), account_name (optional string), post_type (optional string for instagram), success (boolean)';
