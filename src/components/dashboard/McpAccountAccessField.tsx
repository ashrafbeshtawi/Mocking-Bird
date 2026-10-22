'use client';

import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';
import { ALL_ACCOUNTS, formatAccountGrant, addAccountGrant, parseGrant, type McpAccountAccess } from '@/lib/mcpAccess';
import { PLATFORMS, type AccountData, type Platform } from '@/types/accounts';

interface GrantOption {
  grant: string;
  label: string;
  group: string;
}

/** Human-readable name of a grant; an account that is no longer connected shows its id. */
export function getGrantLabel(grant: string, accounts: AccountData[]): string {
  if (grant === ALL_ACCOUNTS) return 'All accounts';
  const { platform, accountId } = parseGrant(grant);
  const platformLabel = PLATFORM_CONFIG[platform as Platform]?.label ?? platform;
  if (accountId === undefined) return `All ${platformLabel}`;
  const account = accounts.find((a) => a.platform === platform && a.id === accountId);
  return account ? `${account.name} (${platformLabel})` : `${accountId} (${platformLabel}, disconnected)`;
}

interface McpAccountAccessFieldProps {
  accounts: AccountData[];
  value: McpAccountAccess;
  onChange: (value: McpAccountAccess) => void;
}

/**
 * Picks the accounts an MCP token may use: "All accounts", "All <platform>", or single accounts.
 * A grant disables the options it already covers, and picking one drops the grants it covers.
 */
export function McpAccountAccessField({ accounts, value, onChange }: McpAccountAccessFieldProps) {
  const options: GrantOption[] = [
    { grant: ALL_ACCOUNTS, label: getGrantLabel(ALL_ACCOUNTS, accounts), group: 'Everything' },
    ...PLATFORMS.flatMap((platform) => [
      { grant: platform, label: getGrantLabel(platform, accounts), group: PLATFORM_CONFIG[platform].label },
      ...accounts
        .filter((account) => account.platform === platform)
        .map((account) => {
          const grant = formatAccountGrant(platform, account.id);
          return { grant, label: getGrantLabel(grant, accounts), group: PLATFORM_CONFIG[platform].label };
        }),
    ]),
  ];
  // Granted accounts that are no longer connected stay visible, so they can be removed
  const unlisted = value
    .filter((grant) => !options.some((option) => option.grant === grant))
    .map((grant) => ({ grant, label: getGrantLabel(grant, accounts), group: 'Disconnected' }));
  const allOptions = [...options, ...unlisted];

  const isCovered = (option: GrantOption) => {
    if (option.grant === ALL_ACCOUNTS) return false;
    if (value.includes(ALL_ACCOUNTS)) return true;
    const { platform, accountId } = parseGrant(option.grant);
    return accountId !== undefined && value.includes(platform);
  };

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      size="small"
      options={allOptions}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selected) => option.grant === selected.grant}
      getOptionDisabled={isCovered}
      value={allOptions.filter((option) => value.includes(option.grant))}
      onChange={(_event, selected, reason, details) => {
        if (reason === 'selectOption' && details) {
          onChange(addAccountGrant(value, details.option.grant));
        } else {
          onChange(selected.map((option) => option.grant));
        }
      }}
      renderInput={(params) => (
        <TextField {...params} label="Account access" placeholder={value.length ? '' : 'Choose accounts'} />
      )}
    />
  );
}
