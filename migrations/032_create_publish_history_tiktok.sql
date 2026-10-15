-- The TikTok post settings a publish_history entry was published with, so a retried upload keeps them.
-- One row per entry that went to TikTok.
CREATE TABLE publish_history_tiktok (
    history_id INTEGER PRIMARY KEY REFERENCES publish_history(id) ON DELETE CASCADE,
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
