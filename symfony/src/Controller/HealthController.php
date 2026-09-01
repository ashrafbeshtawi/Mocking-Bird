<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\HealthCheck;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class HealthController extends AbstractController
{
    #[Route('/api/health-check', name: 'api_health_check', methods: ['GET'])]
    public function __invoke(HealthCheck $healthCheck): JsonResponse
    {
        $report = $healthCheck->report();

        return $this->json($report, $report['database'] ? Response::HTTP_OK : Response::HTTP_SERVICE_UNAVAILABLE);
    }
}
