<?php

declare(strict_types=1);

namespace App\Controller;

use App\Mcp\McpTokenService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Controller for managing MCP server API tokens.
 * Allows users to create long-living tokens for MCP server authentication.
 */
#[Route('/api/mcp/tokens', name: 'api_mcp_tokens_')]
final class McpTokenController extends AbstractController
{
    public function __construct(
        private readonly McpTokenService $tokenService,
    ) {
    }

    /**
     * Create a new long-living token for MCP server access.
     *
     * @param Request $request {
     *   @var int $expiresInDays Days until the token expires (default 30, max 365)
     * }
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function createToken(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'Authentication required'], Response::HTTP_UNAUTHORIZED);
        }

        $userId = (int) $user->getId();
        $expiresInDays = min(365, max(1, (int) $request->request->get('expiresInDays', 30)));

        $token = $this->tokenService->createToken($userId, $expiresInDays);

        return $this->json([
            'message' => 'Token created successfully',
            'token' => $token,
            'expiresInDays' => $expiresInDays,
            'expiresAt' => (new \DateTimeImmutable("now", new \DateTimeZone('UTC')))->modify("+{$expiresInDays} days")->format(\DateTime::ATOM),
        ], Response::HTTP_CREATED);
    }

    /**
     * List all active tokens for the current user.
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function listTokens(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'Authentication required'], Response::HTTP_UNAUTHORIZED);
        }

        $userId = (int) $user->getId();
        $tokens = $this->tokenService->getPublicTokenInfo($userId);

        return $this->json([
            'tokens' => $tokens,
        ], Response::HTTP_OK);
    }

    /**
     * Delete a token (revoke access).
     */
    #[Route('/{token}', name: 'delete', methods: ['DELETE'])]
    public function deleteToken(string $token): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'Authentication required'], Response::HTTP_UNAUTHORIZED);
        }

        $userId = (int) $user->getId();
        $result = $this->tokenService->deleteToken($userId, $token);

        if (!$result) {
            return $this->json(['error' => 'Token not found or already revoked'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'message' => 'Token revoked successfully',
        ], Response::HTTP_OK);
    }

    /**
     * Validate a token and return user info.
     * This is a convenience endpoint for debugging.
     */
    #[Route('/validate', name: 'validate', methods: ['POST'])]
    public function validateToken(Request $request): JsonResponse
    {
        $token = $request->request->get('token');

        if (!$token) {
            return $this->json(['error' => 'Token is required'], Response::HTTP_BAD_REQUEST);
        }

        $userId = $this->tokenService->validateToken($token);

        if (!$userId) {
            return $this->json(['valid' => false, 'error' => 'Invalid or expired token'], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'valid' => true,
            'userId' => $userId,
        ], Response::HTTP_OK);
    }
}