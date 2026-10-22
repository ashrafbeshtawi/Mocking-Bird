-- Drafts target specific accounts: [{"platform": "facebook", "account_id": "<page id>"}, ...].
ALTER TABLE drafts ADD COLUMN target_accounts JSONB NOT NULL DEFAULT '[]';

-- Existing drafts target every account currently connected on each of their target platforms,
-- which is what publishing them did so far.
UPDATE drafts d SET target_accounts = COALESCE((
    SELECT jsonb_agg(jsonb_build_object('platform', a.platform, 'account_id', a.account_id))
    FROM (
        SELECT 'facebook' AS platform, page_id AS account_id, user_id FROM connected_facebook_pages
        UNION ALL
        SELECT 'instagram', ia.instagram_account_id, fp.user_id
        FROM connected_instagram_accounts ia JOIN connected_facebook_pages fp ON fp.id = ia.facebook_page_id
        UNION ALL
        SELECT 'twitter', x_user_id, user_id FROM connected_x_accounts_v1_1
        UNION ALL
        SELECT 'telegram', channel_id, user_id FROM connected_telegram_channels
        UNION ALL
        SELECT 'linkedin', linkedin_user_id, user_id FROM connected_linkedin_accounts
        UNION ALL
        SELECT 'youtube', channel_id, user_id FROM connected_youtube_channels
        UNION ALL
        SELECT 'tiktok', open_id, user_id FROM connected_tiktok_accounts
    ) a
    WHERE a.user_id = d.user_id AND a.platform = ANY(d.target_platforms)
), '[]');

ALTER TABLE drafts DROP COLUMN target_platforms;
