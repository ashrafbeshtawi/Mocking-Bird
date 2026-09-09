<?php

declare(strict_types=1);

namespace App\Mcp;

/**
 * Represents a tool exposed by the MCP server.
 * Tools can be invoked by clients via the MCP protocol.
 */
final class McpTool
{
    public function __construct(
        public readonly string $name,
        public readonly string $description,
        public readonly array $inputSchema,
        public readonly string $handlerClass,
    ) {
    }
}

/**
 * Tool result structure returned by MCP tools.
 */
final class McpToolResult
{
    public function __construct(
        public readonly bool $success,
        public readonly array $content = [],
        public readonly ?string $error = null,
    ) {
    }
}

/**
 * Registry of all available MCP tools.
 * Tools are registered at server boot time and can be listed or invoked.
 */
final class McpToolRegistry
{
    /** @var McpTool[] */
    private array $tools = [];

    public function register(McpTool $tool): void
    {
        $this->tools[$tool->name] = $tool;
    }

    public function get(string $name): ?McpTool
    {
        return $this->tools[$name] ?? null;
    }

    /** @return McpTool[] */
    public function getAll(): array
    {
        return array_values($this->tools);
    }

    public function has(string $name): bool
    {
        return isset($this->tools[$name]);
    }
}