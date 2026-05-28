export function validateJwtSecret(): void {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  if (secret.length < 64) {
    throw new Error(
      `JWT_SECRET must be at least 64 characters. Current length: ${secret.length}\n` +
      'Generate a secure secret with: openssl rand -base64 64'
    );
  }
}
