import * as admin from 'firebase-admin';
import { BrevoApiError } from './brevo-mail';

const COLLECTION = 'contactDeliveryFailures';

export interface ContactDeliveryFailureRecord {
  contactId: string;
  recipientEmail: string;
  /** Legacy Gmail/SMTP user — optional for Brevo-era failures. */
  smtpUser?: string;
  emailProvider?: string;
  failedAt: admin.firestore.FieldValue;
  errorCode: string | null;
  errorSummary: string;
  failureReason: string;
  failureCategory?: string;
  failureStatus?: number | null;
}

const SMTP_FAILURE_REASONS: Record<string, string> = {
  '535': 'SMTP login rejected — App Password invalid, expired, or revoked (often after a Google password change).',
  '534': 'SMTP authentication mechanism not accepted.',
  '550': 'Recipient rejected or mailbox unavailable.',
  '451': 'Temporary server error — retry later.',
  '452': 'Mailbox full or storage limit exceeded.',
  '421': 'SMTP service temporarily unavailable.'
};

const BREVO_FAILURE_REASONS: Record<string, string> = {
  brevo_auth: 'Brevo rejected the API key or sender authentication.',
  brevo_bad_request: 'Brevo rejected the request (invalid payload or sender).',
  brevo_credits: 'Brevo account credits or plan limit reached.',
  brevo_rate_limit: 'Brevo rate limit exceeded — retry later.',
  brevo_server_error: 'Brevo temporary server error — retry later.',
  brevo_client_error: 'Brevo client error.',
  brevo_missing_api_key: 'BREVO_API_KEY is not configured on the function.',
  brevo_missing_message_id: 'Brevo accepted the request but returned no messageId.',
  brevo_unknown: 'Unknown Brevo delivery error.'
};

/** Sanitize nodemailer/Gmail error for Firestore (no stack traces). Kept for legacy recovery paths. */
export function summarizeEmailError(error: unknown): {
  errorCode: string | null;
  errorSummary: string;
  failureReason: string;
} {
  const message = error instanceof Error ? error.message : String(error);
  const firstLine = message.split('\n')[0].trim().slice(0, 500);
  const codeMatch = firstLine.match(/\b(535|534|550|451|452|421)\b/);
  const errorCode = codeMatch ? codeMatch[1] : null;

  let failureReason = SMTP_FAILURE_REASONS[errorCode ?? ''] ?? (firstLine || 'Unknown email delivery error');

  if (errorCode === '535' || /BadCredentials/i.test(firstLine)) {
    failureReason = SMTP_FAILURE_REASONS['535'];
  }

  return {
    errorCode,
    errorSummary: firstLine || 'Unknown email error',
    failureReason
  };
}

export function summarizeBrevoError(error: unknown): {
  errorCode: string | null;
  errorSummary: string;
  failureReason: string;
  failureCategory: string;
  failureStatus: number | null;
} {
  if (error instanceof BrevoApiError) {
    return {
      errorCode: error.httpStatus != null ? String(error.httpStatus) : null,
      errorSummary: error.sanitizedMessage,
      failureReason: BREVO_FAILURE_REASONS[error.failureCategory] || error.sanitizedMessage,
      failureCategory: error.failureCategory,
      failureStatus: error.httpStatus ?? null
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  const firstLine = message.split('\n')[0].trim().slice(0, 400);
  return {
    errorCode: null,
    errorSummary: firstLine || 'Unknown Brevo error',
    failureReason: firstLine || 'Unknown Brevo delivery error',
    failureCategory: 'brevo_unknown',
    failureStatus: null
  };
}

/** Legacy SMTP failure logger (recovery / older paths). */
export async function logContactDeliveryFailure(
  db: admin.firestore.Firestore,
  params: {
    contactId: string;
    recipientEmail: string;
    smtpUser: string;
    error: unknown;
  }
): Promise<void> {
  const { errorCode, errorSummary, failureReason } = summarizeEmailError(params.error);

  const record: ContactDeliveryFailureRecord = {
    contactId: params.contactId,
    recipientEmail: params.recipientEmail,
    smtpUser: params.smtpUser,
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
    errorCode,
    errorSummary,
    failureReason
  };

  await db.collection(COLLECTION).add(record);

  await db.collection('contacts').doc(params.contactId).update({
    emailDelivered: false,
    emailDeliveryFailedAt: admin.firestore.FieldValue.serverTimestamp(),
    emailDeliveryErrorCode: errorCode,
    emailDeliveryErrorSummary: errorSummary,
    emailDeliveryFailureReason: failureReason
  });
}

/** Brevo-era failure logger for submitContactForm. */
export async function logBrevoContactDeliveryFailure(
  db: admin.firestore.Firestore,
  params: {
    contactId: string;
    recipientEmail: string;
    error: unknown;
  }
): Promise<{
  failureCategory: string;
  failureStatus: number | null;
  errorSummary: string;
  failureReason: string;
}> {
  const summarized = summarizeBrevoError(params.error);

  const record: ContactDeliveryFailureRecord = {
    contactId: params.contactId,
    recipientEmail: params.recipientEmail,
    emailProvider: 'brevo',
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
    errorCode: summarized.errorCode,
    errorSummary: summarized.errorSummary,
    failureReason: summarized.failureReason,
    failureCategory: summarized.failureCategory,
    failureStatus: summarized.failureStatus
  };

  await db.collection(COLLECTION).add(record);

  // Operational metadata only — prefer contactDeliveryEvents; legacy contacts docs ignored if missing.
  const eventRef = db.collection('contactDeliveryEvents').doc(params.contactId);
  const eventSnap = await eventRef.get();
  if (eventSnap.exists) {
    await eventRef.update({
      emailDelivered: false,
      emailProvider: 'brevo',
      failureCategory: summarized.failureCategory,
      failureStatus: summarized.failureStatus,
      failureSummary: summarized.errorSummary,
    });
  } else {
    const legacyRef = db.collection('contacts').doc(params.contactId);
    const legacySnap = await legacyRef.get();
    if (legacySnap.exists) {
      await legacyRef.update({
        emailDelivered: false,
        emailProvider: 'brevo',
        emailDeliveryFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        emailDeliveryErrorCode: summarized.errorCode,
        emailDeliveryErrorSummary: summarized.errorSummary,
        emailDeliveryFailureReason: summarized.failureReason,
        failureCategory: summarized.failureCategory,
        failureStatus: summarized.failureStatus,
      });
    }
  }

  return summarized;
}
