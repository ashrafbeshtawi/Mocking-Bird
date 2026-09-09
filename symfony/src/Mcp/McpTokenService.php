<?php

declare(strict_types=1);

namespace App\Mcp;

use App\Repository\McpTokenRepository;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Manages long-living API tokens for MCP server authentication.
 * Tokens are sent in the Authorization header as: Bearer <token>
 */
final class McpTokenService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly McpTokenRepository $tokenRepository,
    ) {
    }

    public function createToken(int $userId, int $expiresInDays = 30): string
    {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $expiresAt = new DateTimeImmutable('now')->modify("+{$expiresInDays} days");

        $tokenEntity = new McpToken();
        $tokenEntity->setUserId($userId);
        $tokenEntity->setTokenHash($tokenHash);
        $tokenEntity->setExpiresAt($expiresAt);
        $tokenEntity->setIsActive(true);

        $this->entityManager->persist($tokenEntity);
        $this->entityManager->flush();

        return $token;
    }

    public function deleteToken(int $userId, string $token): bool
    {
        $tokenHash = hash('sha256', $token);
        $tokenEntity = $this->tokenRepository->findActiveTokenByHash($tokenHash);

        if (!$tokenEntity) {
            return false;
        }

        $tokenEntity->setIsActive(false);
        $this->entityManager->flush();

        return true;
    }

    public function listTokens(int $userId): array
    {
        return $this->tokenRepository->findByUserId($userId);
    }

    public function validateToken(string $token): ?int
    {
        $tokenHash = hash('sha256', $token);
        $tokenEntity = $this->tokenRepository->findActiveTokenByHash($tokenHash);

        if (!$tokenEntity || $tokenEntity->isExpired()) {
            if ($tokenEntity) {
                $tokenEntity->setIsActive(false);
                $this->entityManager->flush();
            }
            return null;
        }

        return $tokenEntity->getUserId();
    }

    public function getPublicTokenInfo(int $userId): array
    {
        $tokens = $this->tokenRepository->findByUserId($userId);
        $publicTokens = [];

        foreach ($tokens as $token) {
            $publicTokens[] = [
                'id' => $token->getId(),
                'expiresAt' => $token->getExpiresAt()->format(DATE_W3C),
                'isActive' => $token->isActive(),
                'createdBy' => 'mcp-server',
            ];
        }

        return $publicTokens;
    }
}