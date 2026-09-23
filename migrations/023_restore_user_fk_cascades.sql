-- Migration 018 dropped the users table with CASCADE, which silently removed the
-- foreign keys (and their ON DELETE CASCADE) from every table created before it.
-- Account deletion relies on one `DELETE FROM users` cleaning up everything, so
-- the constraints are restored here.
--
-- NOT VALID: rows left behind by the 018 clean slate may still point at user ids
-- that no longer exist. The constraint is enforced for new rows and its cascade
-- fires on delete regardless; only the one-off scan of existing rows is skipped.

ALTER TABLE connected_facebook_pages
  DROP CONSTRAINT IF EXISTS connected_facebook_pages_user_id_fkey,
  ADD CONSTRAINT connected_facebook_pages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE connected_x_accounts
  DROP CONSTRAINT IF EXISTS connected_x_accounts_user_id_fkey,
  ADD CONSTRAINT connected_x_accounts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE connected_x_accounts_v1_1
  DROP CONSTRAINT IF EXISTS connected_x_accounts_v1_1_user_id_fkey,
  ADD CONSTRAINT connected_x_accounts_v1_1_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE connected_telegram_channels
  DROP CONSTRAINT IF EXISTS connected_telegram_channels_user_id_fkey,
  ADD CONSTRAINT connected_telegram_channels_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE publish_history
  DROP CONSTRAINT IF EXISTS publish_history_user_id_fkey,
  ADD CONSTRAINT publish_history_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE scheduled_posts
  DROP CONSTRAINT IF EXISTS scheduled_posts_user_id_fkey,
  ADD CONSTRAINT scheduled_posts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ai_prompts
  DROP CONSTRAINT IF EXISTS ai_prompts_user_id_fkey,
  ADD CONSTRAINT ai_prompts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ai_prompts_facebook_matching
  DROP CONSTRAINT IF EXISTS ai_prompts_facebook_matching_user_id_fkey,
  ADD CONSTRAINT ai_prompts_facebook_matching_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ai_prompts_x_matching
  DROP CONSTRAINT IF EXISTS ai_prompts_x_matching_user_id_fkey,
  ADD CONSTRAINT ai_prompts_x_matching_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ai_prompts_instagram_matching
  DROP CONSTRAINT IF EXISTS ai_prompts_instagram_matching_user_id_fkey,
  ADD CONSTRAINT ai_prompts_instagram_matching_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ai_prompts_telegram_matching
  DROP CONSTRAINT IF EXISTS ai_prompts_telegram_matching_user_id_fkey,
  ADD CONSTRAINT ai_prompts_telegram_matching_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ai_providers
  DROP CONSTRAINT IF EXISTS ai_providers_user_id_fkey,
  ADD CONSTRAINT ai_providers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE openai_api_keys
  DROP CONSTRAINT IF EXISTS fk_user,
  DROP CONSTRAINT IF EXISTS openai_api_keys_user_id_fkey,
  ADD CONSTRAINT openai_api_keys_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
