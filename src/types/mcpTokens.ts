import type { McpAccountAccess } from '@/lib/mcpAccess';

export const MCP_TOKEN_TITLE_MAX_LENGTH = 100;

export interface McpTokenInfo {
  id: number;
  title: string;
  account_access: McpAccountAccess;
  created_at: string;
}
