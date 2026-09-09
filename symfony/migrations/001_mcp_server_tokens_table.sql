-- MCP Server Token Table
-- Long-living tokens for authentication (sent in header)
CREATE TABLE IF NOT EXISTS mcp_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user_id ON mcp_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_expires ON mcp_tokens(expires_at);

-- Insert a sample token for testing
INSERT INTO mcp_tokens (user_id, token_hash, expires_at, is_active)
VALUES (
    (SELECT id FROM users WHERE id = 1),
    'sample-token-hash-for-test',
    NOW() + INTERVAL '7 days',
    TRUE
);