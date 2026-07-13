import { SITE_CONTACTS } from './site-contacts';

/**
 * Centralized Brevo / contact-form delivery addresses (non-secret).
 * Override via env when needed; defaults match ministry Brevo setup.
 */
export const BREVO_SENDER_EMAIL =
  (process.env.BREVO_SENDER_EMAIL || '').trim().toLowerCase() || 'contact@dcciministries.com';

export const BREVO_SENDER_NAME =
  (process.env.BREVO_SENDER_NAME || '').trim() || 'DCCI Ministries';

/** Public contact form recipient — Hatun only. */
export function getContactRecipientEmail(): string {
  const fromEnv = (process.env.CONTACT_RECIPIENT_EMAIL || '').trim();
  if (fromEnv) {
    return fromEnv.toLowerCase();
  }
  return String(SITE_CONTACTS.contactFormRecipientEmail || 'hatun@dcciministries.com')
    .trim()
    .toLowerCase();
}

export const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
