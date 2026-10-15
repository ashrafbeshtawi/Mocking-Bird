import { EMPTY_TIKTOK_SETTINGS, parseTikTokSettings, tiktokSettingsError } from '@/lib/tiktok';

describe('tiktokSettingsError', () => {
  it('requires a chosen visibility', () => {
    expect(tiktokSettingsError(EMPTY_TIKTOK_SETTINGS)).toBe('Choose who can view the TikTok post.');
    expect(tiktokSettingsError({ ...EMPTY_TIKTOK_SETTINGS, privacyLevel: 'SELF_ONLY' })).toBeNull();
  });

  it('rejects private branded content', () => {
    expect(tiktokSettingsError({ ...EMPTY_TIKTOK_SETTINGS, privacyLevel: 'SELF_ONLY', isBrandedContent: true }))
      .toMatch(/cannot be private/);
    expect(tiktokSettingsError({ ...EMPTY_TIKTOK_SETTINGS, privacyLevel: 'PUBLIC_TO_EVERYONE', isBrandedContent: true }))
      .toBeNull();
  });
});

describe('parseTikTokSettings', () => {
  it('keeps known values and turns anything else into the empty choice', () => {
    expect(parseTikTokSettings({ privacyLevel: 'MUTUAL_FOLLOW_FRIENDS', allowDuet: true, allowComment: 'yes' })).toEqual({
      ...EMPTY_TIKTOK_SETTINGS,
      privacyLevel: 'MUTUAL_FOLLOW_FRIENDS',
      allowDuet: true,
    });
    expect(parseTikTokSettings({ privacyLevel: 'EVERYONE' })).toEqual(EMPTY_TIKTOK_SETTINGS);
    expect(parseTikTokSettings(null)).toEqual(EMPTY_TIKTOK_SETTINGS);
  });
});
