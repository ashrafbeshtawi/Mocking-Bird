import { PLATFORMS, type AccountData, type Platform } from '@/types/accounts';

/**
 * The accounts an MCP token may use. Each grant is one of:
 * - 'all': every account, including ones connected later; it stands alone
 * - '<platform>': every account on that platform, including ones connected later
 * - '<platform>:<account id>': one account, only where its platform is not granted whole
 */
export type McpAccountAccess = string[];

export const ALL_ACCOUNTS = 'all';

export const formatAccountGrant = (platform: Platform, accountId: string): string => `${platform}:${accountId}`;

export function parseGrant(grant: string): { platform: string; accountId?: string } {
  const separator = grant.indexOf(':');
  return separator === -1
    ? { platform: grant }
    : { platform: grant.slice(0, separator), accountId: grant.slice(separator + 1) };
}

export const hasAccountAccess = (access: McpAccountAccess, platform: Platform, accountId: string): boolean =>
  access.includes(ALL_ACCOUNTS) || access.includes(platform) || access.includes(formatAccountGrant(platform, accountId));

/**
 * Validate an untrusted account_access payload against the user's connected accounts.
 * Single-account grants in currentAccess may name disconnected accounts; they apply again once reconnected.
 * Returns an error message, or null if valid.
 */
export function validateAccountAccess(
  input: unknown,
  accounts: AccountData[],
  currentAccess: McpAccountAccess = []
): string | null {
  if (!Array.isArray(input) || input.length === 0 || input.some((grant) => typeof grant !== 'string')) {
    return 'account_access must be a non-empty array of strings.';
  }
  if (new Set(input).size !== input.length) {
    return 'account_access must not contain duplicates.';
  }
  if (input.includes(ALL_ACCOUNTS)) {
    return input.length === 1 ? null : '"all" covers every account and cannot be combined with other entries.';
  }
  for (const grant of input as string[]) {
    const { platform, accountId } = parseGrant(grant);
    if (!PLATFORMS.includes(platform as Platform)) {
      return `"${grant}" does not name a platform (${PLATFORMS.join(', ')}).`;
    }
    if (accountId === undefined) continue;
    if (input.includes(platform)) {
      return `"${platform}" already covers every ${platform} account, so "${grant}" cannot be added.`;
    }
    if (
      !currentAccess.includes(grant) &&
      !accounts.some((account) => account.platform === platform && account.id === accountId)
    ) {
      return `"${grant}" is not one of your connected accounts.`;
    }
  }
  return null;
}

/** Add a grant, dropping the grants it covers. */
export function addAccountGrant(access: McpAccountAccess, grant: string): McpAccountAccess {
  if (grant === ALL_ACCOUNTS) return [ALL_ACCOUNTS];
  const { accountId } = parseGrant(grant);
  const isCoveredByGrant = (other: string) => accountId === undefined && parseGrant(other).platform === grant;
  return [...access.filter((other) => !isCoveredByGrant(other)), grant];
}
