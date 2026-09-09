<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20250101000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create drafts table for MCP server draft posts';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE drafts (
            id VARCHAR(255) PRIMARY KEY,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            platforms JSON NOT NULL,
            media_urls JSON DEFAULT \'[]\',
            status VARCHAR(20) DEFAULT \'pending\',
            created_at TIMESTAMP(0) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )');
        $this->addSql('CREATE INDEX idx_drafts_user_id ON drafts(user_id)');
        $this->addSql('CREATE INDEX idx_drafts_status ON drafts(status)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_drafts_status');
        $this->addSql('DROP INDEX idx_drafts_user_id');
        $this->addSql('DROP TABLE drafts');
    }
}