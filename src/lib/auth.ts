export function validateCredentials(inputUsername: string, inputPassword: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    console.warn('❌ Missing ADMIN_USERNAME or ADMIN_PASSWORD in environment variables');
    return false;
  }

  return inputUsername === expectedUsername && inputPassword === expectedPassword;
}
