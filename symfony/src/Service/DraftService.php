<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\McpToken;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Handles draft post operations for the MCP server.
 */
final class DraftService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Create a draft post.
     */
    public function createDraft(int $userId, string $content, array $platforms, array $mediaUrls = []): string
    {
        $draftId = 'draft_' . uniqid();

        // Store draft info - in a real implementation, this would be a database entity
        // For now, we'll just return the draft ID
        // TODO: Persist draft to database with content, platforms, media, etc.
        $this->entityManager->getConnection()->executeStatement(
            'INSERT INTO drafts (id, user_id, content, platforms, media_urls, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [$draftId, $userId, $content, json_encode($platforms), json_encode($mediaUrls), 'pending']
        );

        return $draftId;
    }

    /**
     * List all drafts for a user.
     */
    public function listDrafts(int $userId): array
    {
        $drafts = $this->entityManager->getConnection()->fetchAllAssociative(
            'SELECT id, content, platforms, media_urls, status, created_at FROM drafts WHERE user_id = ? ORDER BY created_at DESC',
            [$userId]
        );

        return array_map(fn($draft) => [
            'id' => $draft['id'],
            'content' => $draft['content'],
            'platforms' => json_decode($draft['platforms'], true) ?? [],
            'mediaUrls' => json_decode($draft['media_urls'], true) ?? [],
            'status' => $draft['status'],
            'createdAt' => $draft['created_at'],
        ], $drafts);
    }

    /**
     * Get details of a specific draft.
     */
    public function getDraft(int $userId, string $draftId): ?array
    {
        $draft = $this->entityManager->getConnection()->fetchAssociative(
            'SELECT id, content, platforms, media_urls, status, created_at FROM drafts WHERE id = ? AND user_id = ?',
            [$draftId, $userId]
        );

        if (!$draft) {
            return null;
        }

        return [
            'id' => $draft['id'],
            'content' => $draft['content'],
            'platforms' => json_decode($draft['platforms'], true) ?? [],
            'mediaUrls' => json_decode($draft['media_urls'], true) ?? [],
            'status' => $draft['status'],
            'createdAt' => $draft['created_at'],
        ];
    }

    /**
     * Delete a draft.
     */
    public function deleteDraft(int $userId, string $draftId): bool
    {
        $result = $this->entityManager->getConnection()->executeStatement(
            'DELETE FROM drafts WHERE id = ? AND user_id = ?',
            [$draftId, $userId]
        );

        return $result > 0;
    }
}