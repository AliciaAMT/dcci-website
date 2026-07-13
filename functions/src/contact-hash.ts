import * as crypto from 'crypto';
import { normalizeForRepeatCheck } from './contact-security';
import { requireContactHashSecret } from './contact-secrets';

/**
 * HMAC fingerprints for cooldown / duplicate detection.
 * Uses CONTACT_HASH_SECRET only — never BREVO_API_KEY.
 * Call only during function execution (after secrets are injected).
 */

export function hmacHex(value: string): string {
  const pepper = requireContactHashSecret();
  return crypto.createHmac('sha256', pepper).update(value, 'utf8').digest('hex');
}

export function hashContactEmail(email: string): string {
  return hmacHex(email.trim().toLowerCase());
}

export function hashContactIp(ip: string): string {
  if (!ip || ip === 'unknown') {
    return hmacHex('unknown');
  }
  return hmacHex(ip.trim());
}

/** Stable fingerprint for repeat-message detection (no plaintext stored). */
export function hashMessageFingerprint(subject: string, message: string): string {
  return hmacHex(normalizeForRepeatCheck(subject, message));
}
