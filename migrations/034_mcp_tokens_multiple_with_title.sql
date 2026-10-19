-- Allow several MCP tokens per user, each with a title.
-- Existing tokens keep working and get the title 'MCP token'; new tokens must name a title.
ALTER TABLE mcp_tokens DROP CONSTRAINT mcp_tokens_pkey;
ALTER TABLE mcp_tokens ADD COLUMN id SERIAL PRIMARY KEY;
ALTER TABLE mcp_tokens ADD COLUMN title TEXT NOT NULL DEFAULT 'MCP token';
ALTER TABLE mcp_tokens ALTER COLUMN title DROP DEFAULT;
CREATE INDEX mcp_tokens_user_id_idx ON mcp_tokens (user_id);
