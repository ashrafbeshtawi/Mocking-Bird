-- Which accounts an MCP token may use: {all}, or any mix of '<platform>' (every account
-- on that platform, including ones connected later) and '<platform>:<account id>'.
-- Existing tokens keep access to every account; new tokens must state their access.
ALTER TABLE mcp_tokens ADD COLUMN account_access TEXT[] NOT NULL DEFAULT '{all}';
ALTER TABLE mcp_tokens ALTER COLUMN account_access DROP DEFAULT;
