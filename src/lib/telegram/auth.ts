import crypto from 'crypto';

export interface TelegramLoginData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Verifies Telegram Login Widget data
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(data: TelegramLoginData, botToken: string): boolean {
  const { hash, ...checkData } = data;

  // Create data-check-string by sorting keys alphabetically
  const dataCheckString = Object.keys(checkData)
    .sort()
    .map((key) => `${key}=${checkData[key as keyof typeof checkData]}`)
    .join('\n');

  // Create secret key by SHA256 of bot token
  const secretKey = crypto.createHash('sha256').update(botToken).digest();

  // Calculate HMAC-SHA256 of data-check-string
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}

/**
 * Checks if auth_date is within acceptable range (1 hour)
 */
export function isAuthDateValid(authDate: number, maxAgeSeconds = 3600): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime - authDate <= maxAgeSeconds;
}
