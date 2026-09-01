<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class HttpSmokeTest extends WebTestCase
{
    public function testHomepageResponds(): void
    {
        $client = static::createClient();
        $client->request('GET', '/');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorTextContains('h1', 'Mockingbird');
    }

    public function testHealthCheckReportsDatabaseUp(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/health-check');

        $this->assertResponseIsSuccessful();

        $report = json_decode((string) $client->getResponse()->getContent(), true);

        $this->assertSame('ok', $report['status']);
        $this->assertTrue($report['database']);
    }
}
