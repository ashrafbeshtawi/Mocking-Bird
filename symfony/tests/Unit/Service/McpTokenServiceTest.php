<?php

declare(strict_types=1);

namespace App\Tests\Unit\Service;

use App\Entity\McpToken;
use App\Repository\McpTokenRepository;
use App\Service\McpTokenService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

final class McpTokenServiceTest extends TestCase
{
    public function testCreatesTokenWithHashedValue(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $repository = $this->createMock(McpTokenRepository::class);

        $entityManager->expects($this->once())
            ->method('persist')
            ->with($this->isType('object'));
        $entityManager->expects($this->once())
            ->method('flush');

        $service = new McpTokenService($entityManager, $repository);

        $token = $service->createToken(42, 7);

        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $token);
    }

    public function testValidatesTokenByHash(): void
    {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);

        $tokenEntity = new McpToken();
        $tokenEntity->setUserId(123);
        $tokenEntity->setTokenHash($tokenHash);
        $tokenEntity->setExpiresAt(new \DateTimeImmutable('+1 day'));
        $tokenEntity->setIsActive(true);

        $repository = $this->createMock(McpTokenRepository::class);
        $repository->method('findActiveTokenByHash')->with($tokenHash)->willReturn($tokenEntity);

        $entityManager = $this->createMock(EntityManagerInterface::class);

        $service = new McpTokenService($entityManager, $repository);

        $this->assertSame(123, $service->validateToken($token));
    }

    public function testRejectsExpiredToken(): void
    {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);

        $tokenEntity = new McpToken();
        $tokenEntity->setUserId(123);
        $tokenEntity->setTokenHash($tokenHash);
        $tokenEntity->setExpiresAt(new \DateTimeImmutable('-1 day'));
        $tokenEntity->setIsActive(true);

        $repository = $this->createMock(McpTokenRepository::class);
        $repository->method('findActiveTokenByHash')->with($tokenHash)->willReturn($tokenEntity);

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->once())
            ->method('flush');

        $service = new McpTokenService($entityManager, $repository);

        $this->assertNull($service->validateToken($token));
    }
}