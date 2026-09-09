<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\McpToken;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

final class McpTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, McpToken::class);
    }

    public function findActiveTokenByHash(string $tokenHash): ?McpToken
    {
        return $this->findOneBy([
            'tokenHash' => $tokenHash,
            'isActive' => true,
        ]);
    }

    public function findByUserId(int $userId): array
    {
        return $this->findBy(['userId' => $userId], ['createdAt' => 'DESC']);
    }
}