<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;

/**
 * Provides access to linked media targets for MCP tools.
 */
final class LinkedMediaTargetsService
{
    public function __construct(
        private readonly Connection $connection,
    ) {
    }

    /**
     * @return array{facebook_pages: array, x_accounts: array, instagram_accounts: array, telegram_channels: array}
     */
    public function listForUser(int $userId): array
    {
        $facebookPages = $this->connection->fetchAllAssociative(
            'SELECT page_id, page_name FROM connected_facebook_pages WHERE user_id = ?',
            [$userId]
        );

        $xAccounts = $this->connection->fetchAllAssociative(
            'SELECT id, name FROM connected_x_accounts WHERE user_id = ?',
            [$userId]
        );

        $instagramAccounts = $this->connection->fetchAllAssociative(
            'SELECT id, username FROM connected_instagram_accounts WHERE user_id = ?',
            [$userId]
        );

        $telegramChannels = $this->connection->fetchAllAssociative(
            'SELECT channel_id, channel_title FROM connected_telegram_channels WHERE user_id = ?',
            [$userId]
        );

        return [
            'facebook_pages' => $facebookPages,
            'x_accounts' => $xAccounts,
            'instagram_accounts' => $instagramAccounts,
            'telegram_channels' => $telegramChannels,
        ];
    }
}