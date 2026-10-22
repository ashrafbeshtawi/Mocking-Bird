import { addAccountGrant, hasAccountAccess, validateAccountAccess } from '@/lib/mcpAccess';
import type { AccountData } from '@/types/accounts';

const accounts: AccountData[] = [
  { platform: 'facebook', id: 'p1', name: 'My Page' },
  { platform: 'facebook', id: 'p2', name: 'Other Page' },
  { platform: 'twitter', id: 'x1', name: 'handle' },
];

describe('validateAccountAccess', () => {
  it.each([
    [['all']],
    [['facebook']],
    [['facebook', 'twitter:x1']],
    [['facebook:p1', 'facebook:p2', 'tiktok']],
  ])('accepts %j', (access) => {
    expect(validateAccountAccess(access, accounts)).toBeNull();
  });

  it.each([
    [undefined, 'non-empty array'],
    [[], 'non-empty array'],
    [[7], 'non-empty array'],
    [['facebook', 'facebook'], 'duplicates'],
    [['all', 'facebook'], '"all" covers every account'],
    [['myspace'], 'does not name a platform'],
    [['facebook', 'facebook:p1'], 'already covers every facebook account'],
    [['twitter:x9'], 'not one of your connected accounts'],
    [['twitter:p1'], 'not one of your connected accounts'],
  ])('rejects %j', (access, message) => {
    expect(validateAccountAccess(access, accounts)).toContain(message);
  });
});

describe('hasAccountAccess', () => {
  it('grants every account with "all", a whole platform with its name, and single accounts by id', () => {
    expect(hasAccountAccess(['all'], 'tiktok', 'any')).toBe(true);
    expect(hasAccountAccess(['facebook'], 'facebook', 'connected-later')).toBe(true);
    expect(hasAccountAccess(['facebook'], 'twitter', 'x1')).toBe(false);
    expect(hasAccountAccess(['twitter:x1'], 'twitter', 'x1')).toBe(true);
    expect(hasAccountAccess(['twitter:x1'], 'twitter', 'x2')).toBe(false);
  });
});

describe('addAccountGrant', () => {
  it('replaces everything with "all"', () => {
    expect(addAccountGrant(['facebook', 'twitter:x1'], 'all')).toEqual(['all']);
  });

  it('drops the single accounts a whole platform covers', () => {
    expect(addAccountGrant(['facebook:p1', 'twitter:x1', 'facebook:p2'], 'facebook')).toEqual([
      'twitter:x1',
      'facebook',
    ]);
  });

  it('adds a single account next to the others', () => {
    expect(addAccountGrant(['facebook'], 'twitter:x1')).toEqual(['facebook', 'twitter:x1']);
  });
});
