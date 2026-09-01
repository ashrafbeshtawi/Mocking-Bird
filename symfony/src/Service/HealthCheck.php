<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;

final class HealthCheck
{
    public function __construct(private readonly Connection $connection)
    {
    }

    /**
     * @return array{status: string, database: bool}
     */
    public function report(): array
    {
        try {
            $this->connection->executeQuery('SELECT 1');
            $databaseUp = true;
        } catch (\Throwable) {
            $databaseUp = false;
        }

        return [
            'status' => $databaseUp ? 'ok' : 'degraded',
            'database' => $databaseUp,
        ];
    }
}
