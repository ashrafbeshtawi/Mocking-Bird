import { getPlatformConfig } from '@/lib/platformConfig';
import type { Platform, TargetAccount } from '@/types/accounts';

/** The targets whose account is no longer connected, given the connected account ids of a platform. */
export const findMissingTargets = (
  targets: TargetAccount[],
  getConnectedIds: (platform: Platform) => string[]
): TargetAccount[] => targets.filter((target) => !getConnectedIds(target.platform).includes(target.account_id));

/** A sentence telling the user which draft targets are skipped because they are no longer connected. */
export const describeMissingTargets = (targets: TargetAccount[]): string => {
  const list = targets
    .map((target) => `${getPlatformConfig(target.platform)?.label ?? target.platform} ${target.account_id}`)
    .join(', ');
  const noun = targets.length === 1 ? 'account is' : 'accounts are';
  return `${targets.length} ${noun} no longer connected and will be skipped: ${list}. Reconnect ${targets.length === 1 ? 'it' : 'them'} to publish there.`;
};
