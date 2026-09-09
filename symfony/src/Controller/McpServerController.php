<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\LinkedMediaTargetsService;
use App\Service\DraftService;
use App\Mcp\McpTokenService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * MCP (Model Context Protocol) Server endpoint.
 * Provides AI tools for interacting with Mockingbird services.
 * All requests must include an Authorization header: Bearer <token>
 */
final class McpServerController
{
    public function __construct(
        private readonly McpTokenService $tokenService,
        private readonly LinkedMediaTargetsService $linkedMediaService,
        private readonly DraftService $draftService,
    ) {
    }

    /**
     * Get server capabilities and list of available tools
     * GET /api/mcp/capabilities
     */
    #[Route('/api/mcp/capabilities', name: 'api_mcp_capabilities', methods: ['GET'])]
    public function getCapabilities(): JsonResponse
    {
        $tools = [
            [
                'name' => 'list_linked_media_targets',
                'description' => 'List all linked media targets (Facebook pages, X accounts, Instagram accounts, Telegram channels)',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [],
                    'required' => [],
                ],
            ],
            [
                'name' => 'create_draft_post',
                'description' => 'Create a draft post that can be published later',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'content' => ['type' => 'string', 'description' => 'Post content'],
                        'platforms' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Platforms to publish to'],
                        'mediaUrls' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Media URLs'],
                    ],
                    'required' => ['content', 'platforms'],
                ],
            ],
            [
                'name' => 'list_drafts',
                'description' => 'List all draft posts',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [],
                    'required' => [],
                ],
            ],
            [
                'name' => 'get_draft',
                'description' => 'Get details of a specific draft',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'draftId' => ['type' => 'string', 'description' => 'Draft ID'],
                    ],
                    'required' => ['draftId'],
                ],
            ],
            [
                'name' => 'delete_draft',
                'description' => 'Delete a draft',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'draftId' => ['type' => 'string', 'description' => 'Draft ID'],
                    ],
                    'required' => ['draftId'],
                ],
            ],
        ];

        return $this->json([
            'protocol' => 'mcp',
            'version' => '1.0.0',
            'server' => 'Mockingbird',
            'tools' => $tools,
        ], Response::HTTP_OK, ['Content-Type' => 'application/json']);
    }

    /**
     * Execute an MCP tool
     * POST /api/mcp/execute
     */
    #[Route('/api/mcp/execute', name: 'api_mcp_execute', methods: ['POST'])]
    public function executeTool(Request $request): JsonResponse
    {
        $token = $this->extractToken($request);
        $userId = $this->tokenService->validateToken($token);

        if (!$userId) {
            return $this->json([
                'error' => 'Invalid or expired token',
                'code' => 'INVALID_TOKEN',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['name']) || !isset($data['arguments'])) {
            return $this->json([
                'error' => 'Missing tool name or arguments',
                'code' => 'INVALID_REQUEST',
            ], Response::HTTP_BAD_REQUEST);
        }

        $toolName = $data['name'];
        $arguments = $data['arguments'] ?? [];

        try {
            $result = $this->handleTool($userId, $toolName, $arguments);
            return $this->json($result, Response::HTTP_OK, ['Content-Type' => 'application/json']);
        } catch (\Exception $e) {
            return $this->json([
                'error' => $e->getMessage(),
                'code' => 'INTERNAL_ERROR',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Health check endpoint for MCP server
     * GET /api/mcp/health
     */
    #[Route('/api/mcp/health', name: 'api_mcp_health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        return $this->json([
            'status' => 'healthy',
            'timestamp' => (new \DateTime())->format(\DateTime::ATOM),
            'version' => '1.0.0',
        ], Response::HTTP_OK);
    }

    /**
     * Extract token from Authorization header
     */
    private function extractToken(Request $request): string
    {
        $authHeader = $request->headers->get('Authorization');

        if (!$authHeader) {
            throw new \InvalidArgumentException('Authorization header is required');
        }

        if (!str_starts_with($authHeader, 'Bearer ')) {
            throw new \InvalidArgumentException('Invalid authorization header format. Expected: Bearer <token>');
        }

        return substr($authHeader, 7);
    }

    /**
     * Handle tool execution
     */
    private function handleTool(int $userId, string $toolName, array $arguments): array
    {
        return match ($toolName) {
            'list_linked_media_targets' => $this->handleListLinkedMediaTargets($userId),
            'create_draft_post' => $this->handleCreateDraftPost($userId, $arguments),
            'list_drafts' => $this->handleListDrafts($userId),
            'get_draft' => $this->handleGetDraft($userId, $arguments),
            'delete_draft' => $this->handleDeleteDraft($userId, $arguments),
            default => throw new \InvalidArgumentException("Unknown tool: {$toolName}"),
        };
    }

    /**
     * Handle list_linked_media_targets tool
     */
    private function handleListLinkedMediaTargets(int $userId): array
    {
        $targets = $this->linkedMediaService->listForUser($userId);

        return [
            'success' => true,
            'data' => $targets,
        ];
    }

    /**
     * Handle create_draft_post tool
     */
    private function handleCreateDraftPost(int $userId, array $arguments): array
    {
        $content = $arguments['content'] ?? '';
        $platforms = $arguments['platforms'] ?? [];
        $mediaUrls = $arguments['mediaUrls'] ?? [];

        if (empty($content)) {
            throw new \InvalidArgumentException('Content is required');
        }

        if (empty($platforms)) {
            throw new \InvalidArgumentException('At least one platform is required');
        }

        $draftId = $this->draftService->createDraft($userId, $content, $platforms, $mediaUrls);

        return [
            'success' => true,
            'draftId' => $draftId,
            'message' => 'Draft created successfully',
        ];
    }

    /**
     * Handle list_drafts tool
     */
    private function handleListDrafts(int $userId): array
    {
        $drafts = $this->draftService->listDrafts($userId);

        return [
            'success' => true,
            'drafts' => $drafts,
        ];
    }

    /**
     * Handle get_draft tool
     */
    private function handleGetDraft(int $userId, array $arguments): array
    {
        $draftId = $arguments['draftId'] ?? null;

        if (!$draftId) {
            throw new \InvalidArgumentException('draftId is required');
        }

        $draft = $this->draftService->getDraft($userId, $draftId);

        if (!$draft) {
            return [
                'success' => false,
                'error' => "Draft {$draftId} not found",
            ];
        }

        return [
            'success' => true,
            'draft' => $draft,
        ];
    }

    /**
     * Handle delete_draft tool
     */
    private function handleDeleteDraft(int $userId, array $arguments): array
    {
        $draftId = $arguments['draftId'] ?? null;

        if (!$draftId) {
            throw new \InvalidArgumentException('draftId is required');
        }

        $result = $this->draftService->deleteDraft($userId, $draftId);

        return [
            'success' => $result,
            'message' => $result ? "Draft {$draftId} deleted successfully" : "Draft {$draftId} not found",
        ];
    }
}