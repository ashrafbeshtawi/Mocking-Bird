-- The YouTube title a draft is meant to be published with; empty uses the video's file name.
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS youtube_title TEXT NOT NULL DEFAULT '';

-- TikTok post settings suggested for a draft (e.g. by an MCP client). The publish dialog
-- only offers them; TikTok requires the user to make every choice there.
CREATE TABLE drafts_tiktok (
    draft_id INTEGER PRIMARY KEY REFERENCES drafts(id) ON DELETE CASCADE,
    privacy_level TEXT NOT NULL
        CHECK (privacy_level IN ('PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY')),
    allow_comment BOOLEAN NOT NULL,
    allow_duet BOOLEAN NOT NULL,
    allow_stitch BOOLEAN NOT NULL,
    is_your_brand BOOLEAN NOT NULL,
    is_branded_content BOOLEAN NOT NULL,
    -- TikTok does not allow branded content to be private.
    CHECK (NOT (is_branded_content AND privacy_level = 'SELF_ONLY'))
);
