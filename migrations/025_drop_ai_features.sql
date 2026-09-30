-- Drops the AI prompt, prompt-assignment, provider and API-key tables together
-- with their indexes and triggers. The shared set_timestamp() trigger function
-- stays; other tables use it.
--
-- Deletes stored prompts, prompt assignments and AI API keys.
-- Assignment tables first: they reference ai_prompts, which references ai_providers.

DROP TABLE IF EXISTS ai_prompts_facebook_matching;
DROP TABLE IF EXISTS ai_prompts_x_matching;
DROP TABLE IF EXISTS ai_prompts_instagram_matching;
DROP TABLE IF EXISTS ai_prompts_telegram_matching;
DROP TABLE IF EXISTS ai_prompts;
DROP TABLE IF EXISTS ai_providers;
DROP TABLE IF EXISTS openai_api_keys;
