/**
 * Contact-form crypto secret helpers.
 * Secrets are read only when these functions run (request/job time), never at module load.
 * Never log secret values.
 */

export class ContactSecretConfigError extends Error {
  readonly code = 'contact_secret_config';

  constructor(message: string) {
    super(message);
    this.name = 'ContactSecretConfigError';
  }
}

/** Sanitized message safe for HTTP / Cloud Logging (no secret material). */
export function sanitizedSecretConfigMessage(err: unknown): string {
  if (err instanceof ContactSecretConfigError) {
    return err.message;
  }
  return 'Contact form cryptographic secrets are not configured correctly.';
}

/**
 * CONTACT_HASH_SECRET — HMAC pepper only.
 * Required format: at least 32 characters of high-entropy random data
 * (recommend 64 hex chars from a CSPRNG).
 */
export function requireContactHashSecret(): string {
  const value = (process.env.CONTACT_HASH_SECRET || '').trim();
  if (!value) {
    throw new ContactSecretConfigError(
      'CONTACT_HASH_SECRET is missing. Set the Firebase secret before deploying submitContactForm.'
    );
  }
  if (value.length < 32) {
    throw new ContactSecretConfigError(
      'CONTACT_HASH_SECRET is too short. Use at least 32 characters of high-entropy random data.'
    );
  }
  // Never accept Brevo key as a substitute (defense in depth if mis-bound).
  const brevo = (process.env.BREVO_API_KEY || '').trim();
  if (brevo && value === brevo) {
    throw new ContactSecretConfigError(
      'CONTACT_HASH_SECRET must not equal BREVO_API_KEY. Use an independent secret.'
    );
  }
  return value;
}

/**
 * CONTACT_RETRY_ENCRYPTION_KEY — AES-256-GCM key material only.
 * Required format: exactly 64 hexadecimal characters (32 bytes).
 */
export function requireContactRetryEncryptionKeyHex(): string {
  const value = (process.env.CONTACT_RETRY_ENCRYPTION_KEY || '').trim();
  if (!value) {
    throw new ContactSecretConfigError(
      'CONTACT_RETRY_ENCRYPTION_KEY is missing. Set the Firebase secret before deploying contact retry.'
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new ContactSecretConfigError(
      'CONTACT_RETRY_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256).'
    );
  }
  const brevo = (process.env.BREVO_API_KEY || '').trim();
  if (brevo && value.toLowerCase() === brevo.toLowerCase()) {
    throw new ContactSecretConfigError(
      'CONTACT_RETRY_ENCRYPTION_KEY must not equal BREVO_API_KEY. Use an independent secret.'
    );
  }
  return value;
}

/**
 * Integer key version stored on retry documents (default 1).
 * Increment CONTACT_RETRY_KEY_VERSION when rotating CONTACT_RETRY_ENCRYPTION_KEY
 * after pending payloads are drained (or accept that old keyVersion docs cannot decrypt).
 */
export function getContactRetryKeyVersion(): number {
  const raw = (process.env.CONTACT_RETRY_KEY_VERSION || '1').trim();
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return n;
}
