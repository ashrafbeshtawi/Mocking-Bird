<?php

declare(strict_types=1);

namespace App\Tests\E2E;

use Symfony\Component\Panther\PantherTestCase;

final class HomepageTest extends PantherTestCase
{
    public function testHomepageRendersInChromium(): void
    {
        $client = static::createPantherClient();
        $client->request('GET', '/');

        $this->assertSelectorTextContains('h1', 'Mockingbird');
    }
}
