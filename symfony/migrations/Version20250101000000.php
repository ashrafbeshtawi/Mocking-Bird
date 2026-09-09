<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20250101000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create mcp_tokens table for long-living MCP server authentication tokens';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE mcp_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP(0) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP(0) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )');
        $this->addSql('CREATE INDEX idx_mcp_tokens_user_id ON mcp_tokens(user_id)');
        $this->addSql('CREATE INDEX idx_mcp_tokens_expires ON mcp_tokens(expires_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_mcp_tokens_expires');
        $this->addSql('DROP INDEX idx_mcp_tokens_user_id');
        $this->addSql('DROP TABLE mcp_tokens');
    }
}