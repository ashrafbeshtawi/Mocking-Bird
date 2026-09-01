<?php

declare(strict_types=1);

namespace App\Tests\Unit\Service;

use App\Service\HealthCheck;
use Doctrine\DBAL\Connection;
use PHPUnit\Framework\TestCase;

final class HealthCheckTest extends TestCase
{
    public function testReportsOkWhenDatabaseResponds(): void
    {
        $connection = $this->createMock(Connection::class);
        $connection->expects($this->once())->method('executeQuery')->with('SELECT 1');

        $report = (new HealthCheck($connection))->report();

        $this->assertSame(['status' => 'ok', 'database' => true], $report);
    }

    public function testReportsDegradedWhenDatabaseIsDown(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('executeQuery')->willThrowException(new \RuntimeException('connection refused'));

        $report = (new HealthCheck($connection))->report();

        $this->assertSame(['status' => 'degraded', 'database' => false], $report);
    }
}
