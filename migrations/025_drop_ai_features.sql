-- The in-app AI features (prompts, per-account prompt matching, AI provider /
-- OpenAI key storage, content transformation) are replaced by the MCP endpoint.
-- Their tables are dropped here; their indexes and triggers go with them.
-- The shared set_timestamp() trigger function stays: non-AI tables use it.
--
-- Irreversible: stored prompts, prompt assignments and AI API keys are deleted.
-- Matching tables first — they reference ai_prompts, which references ai_providers.

DROP TABLE IF EXISTS ai_prompts_facebook_matching;
DROP TABLE IF EXISTS ai_prompts_x_matching;
DROP TABLE IF EXISTS ai_prompts_instagram_matching;
DROP TABLE IF EXISTS ai_prompts_telegram_matching;
DROP TABLE IF EXISTS ai_prompts;
DROP TABLE IF EXISTS ai_providers;
DROP TABLE IF EXISTS openai_api_keys;
