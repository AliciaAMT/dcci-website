import * as admin from 'firebase-admin';
import { FORM_VERSION } from './contact-retry';

export const CONTACT_DELIVERY_EVENTS = 'contactDeliveryEvents';
export const CONTACT_OPERATIONAL_ALERTS = 'contactOperationalAlerts';

export const HEALTH_FAILURE_WINDOW_MS = 30 * 60 * 1000;
export const HEALTH_FAILURE_THRESHOLD = 5;

export interface CreateDeliveryEventInput {
  emailHash: string;
  ipHash: string;
  messageFingerprint: string;
  sourcePage: string;
  newsletterOptIn: boolean;
  formVersion?: string;
}

/** Permanent operational audit row — never stores message body or visitor email. */
export async function createContactDeliveryEvent(
  db: admin.firestore.Firestore,
  input: CreateDeliveryEventInput
): Promise<FirebaseFirestore.DocumentReference> {
  return db.collection(CONTACT_DELIVERY_EVENTS).add({
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    sourcePage: input.sourcePage || 'unknown',
    formVersion: input.formVersion || FORM_VERSION,
    emailProvider: 'brevo',
    emailDeliveryAttemptedAt: null,
    emailDelivered: false,
    emailDeliveredAt: null,
    providerMessageId: null,
    failureCategory: null,
    failureStatus: null,
    failureSummary: null,
    retryCount: 0,
    lastRetryAt: null,
    recoveredAt: null,
    newsletterOptIn: input.newsletterOptIn === true,
    emailHash: input.emailHash,
    ipHash: input.ipHash,
    messageFingerprint: input.messageFingerprint,
  });
}

export async function markDeliveryAttempted(
  db: admin.firestore.Firestore,
  contactId: string
): Promise<void> {
  await db.collection(CONTACT_DELIVERY_EVENTS).doc(contactId).update({
    emailDeliveryAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
    emailProvider: 'brevo',
  });
}

export async function markDeliverySuccess(
  db: admin.firestore.Firestore,
  contactId: string,
  providerMessageId: string,
  opts?: { recovered?: boolean; incrementRetry?: boolean }
): Promise<void> {
  const update: Record<string, unknown> = {
    emailDelivered: true,
    emailDeliveredAt: admin.firestore.FieldValue.serverTimestamp(),
    emailProvider: 'brevo',
    providerMessageId,
    failureCategory: null,
    failureStatus: null,
    failureSummary: null,
  };
  if (opts?.recovered) {
    update.recoveredAt = admin.firestore.FieldValue.serverTimestamp();
  }
  if (opts?.incrementRetry) {
    update.retryCount = admin.firestore.FieldValue.increment(1);
    update.lastRetryAt = admin.firestore.FieldValue.serverTimestamp();
  }
  await db.collection(CONTACT_DELIVERY_EVENTS).doc(contactId).update(update);
}

export async function markDeliveryFailureOnEvent(
  db: admin.firestore.Firestore,
  contactId: string,
  params: {
    failureCategory: string;
    failureStatus: number | null;
    failureSummary: string;
    incrementRetry?: boolean;
  }
): Promise<void> {
  const update: Record<string, unknown> = {
    emailDelivered: false,
    emailProvider: 'brevo',
    failureCategory: params.failureCategory,
    failureStatus: params.failureStatus,
    failureSummary: params.failureSummary.slice(0, 400),
  };
  if (params.incrementRetry) {
    update.retryCount = admin.firestore.FieldValue.increment(1);
    update.lastRetryAt = admin.firestore.FieldValue.serverTimestamp();
  }
  await db.collection(CONTACT_DELIVERY_EVENTS).doc(contactId).update(update);
}

/**
 * If ≥5 delivery failures in 30 minutes and no recent open alert of the same type,
 * create exactly one operational alert document (no email spam).
 */
export async function maybeCreateDeliveryHealthAlert(
  db: admin.firestore.Firestore
): Promise<boolean> {
  const windowStart = admin.firestore.Timestamp.fromMillis(Date.now() - HEALTH_FAILURE_WINDOW_MS);

  const recentFailures = await db
    .collection('contactDeliveryFailures')
    .where('failedAt', '>=', windowStart)
    .limit(HEALTH_FAILURE_THRESHOLD)
    .get();

  if (recentFailures.size < HEALTH_FAILURE_THRESHOLD) {
    return false;
  }

  const recentAlerts = await db
    .collection(CONTACT_OPERATIONAL_ALERTS)
    .where('type', '==', 'contact_delivery_failures')
    .where('createdAt', '>=', windowStart)
    .limit(1)
    .get();

  if (!recentAlerts.empty) {
    return false;
  }

  await db.collection(CONTACT_OPERATIONAL_ALERTS).add({
    type: 'contact_delivery_failures',
    status: 'open',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    windowMs: HEALTH_FAILURE_WINDOW_MS,
    failureThreshold: HEALTH_FAILURE_THRESHOLD,
    failureCountObserved: recentFailures.size,
    summary:
      'Repeated contact-form Brevo delivery failures within 30 minutes. Check Brevo credentials, sender verification, and function logs. Do not email visitors from this alert.',
  });

  return true;
}
