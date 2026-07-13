import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import {
  ContactSecretConfigError,
  getContactRetryKeyVersion,
  requireContactRetryEncryptionKeyHex,
} from './contact-secrets';

export const CONTACT_RETRY_PAYLOADS = 'contactRetryPayloads';

/** Expire unrecovered payloads after 48 hours (within 24–72h policy). */
export const RETRY_PAYLOAD_TTL_MS = 48 * 60 * 60 * 1000;

/** After successful recovery, keep ciphertext ~1 hour then delete. */
export const RETRY_RECOVERED_RETENTION_MS = 60 * 60 * 1000;

/** Cap automatic retries so a poison payload does not email forever. */
export const MAX_CONTACT_RETRY_ATTEMPTS = 8;

export const FORM_VERSION = '2026-07-privacy-v1';

export interface ContactRetryPlaintext {
  name: string;
  email: string;
  subject: string;
  message: string;
  newsletter: boolean;
  clientIP: string;
  sourcePage: string;
}

function getEncryptionKeyBytes(): Buffer {
  const hex = requireContactRetryEncryptionKeyHex();
  return Buffer.from(hex, 'hex');
}

export function encryptRetryPayload(plaintext: ContactRetryPlaintext): {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
} {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKeyBytes(), iv);
  const json = JSON.stringify(plaintext);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: getContactRetryKeyVersion(),
  };
}

export function decryptRetryPayload(params: {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion?: number;
}): ContactRetryPlaintext {
  const currentVersion = getContactRetryKeyVersion();
  const docVersion = params.keyVersion ?? 1;
  if (docVersion !== currentVersion) {
    throw new ContactSecretConfigError(
      `Retry payload keyVersion ${docVersion} does not match active CONTACT_RETRY_KEY_VERSION ${currentVersion}. Restore the matching encryption key or wait for TTL cleanup.`
    );
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKeyBytes(),
    Buffer.from(params.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(params.authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(params.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(decrypted) as ContactRetryPlaintext;
}

/**
 * Store encrypted visitor fields for disaster-recovery retry only.
 * Doc id === contactId for 1:1 lookup. Not for browsing or admin UI.
 * Never logs plaintext.
 */
export async function writeContactRetryPayload(
  db: admin.firestore.Firestore,
  contactId: string,
  plaintext: ContactRetryPlaintext
): Promise<void> {
  const enc = encryptRetryPayload(plaintext);
  const now = Date.now();
  await db.collection(CONTACT_RETRY_PAYLOADS).doc(contactId).set({
    contactId,
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    authTag: enc.authTag,
    keyVersion: enc.keyVersion,
    status: 'pending',
    attemptCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(now + RETRY_PAYLOAD_TTL_MS),
    deleteAfter: admin.firestore.Timestamp.fromMillis(now + RETRY_PAYLOAD_TTL_MS),
  });
}

/**
 * Claim a pending payload for sending (concurrency protection).
 * Returns null if another worker already claimed it, it is not pending,
 * attempts are exhausted, or the payload is past expiresAt (marks expired without bumping attemptCount).
 */
export async function claimPendingRetryPayload(
  db: admin.firestore.Firestore,
  contactId: string
): Promise<FirebaseFirestore.DocumentData | null> {
  const ref = db.collection(CONTACT_RETRY_PAYLOADS).doc(contactId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return null;
    }
    const data = snap.data()!;
    if (data.status !== 'pending') {
      return null;
    }

    const expiresAt = data.expiresAt as admin.firestore.Timestamp | undefined;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
      // Do not increment attemptCount — leave for cleanup via deleteAfter
      tx.update(ref, { status: 'expired' });
      return null;
    }

    const attempts = typeof data.attemptCount === 'number' ? data.attemptCount : 0;
    if (attempts >= MAX_CONTACT_RETRY_ATTEMPTS) {
      tx.update(ref, {
        status: 'exhausted',
        deleteAfter: admin.firestore.Timestamp.fromMillis(Date.now() + RETRY_RECOVERED_RETENTION_MS),
      });
      return null;
    }
    tx.update(ref, {
      status: 'sending',
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      attemptCount: attempts + 1,
    });
    return { ...data, attemptCount: attempts + 1 };
  });
}

/** Return a claimed payload to pending after a failed send attempt. */
export async function releaseRetryPayloadToPending(
  db: admin.firestore.Firestore,
  contactId: string
): Promise<void> {
  const ref = db.collection(CONTACT_RETRY_PAYLOADS).doc(contactId);
  const snap = await ref.get();
  if (!snap.exists) {
    return;
  }
  if (snap.data()?.status === 'sending') {
    await ref.update({ status: 'pending' });
  }
}

/** Mark recovered; schedule hard delete ~1 hour later (do not delete immediately). */
export async function markRetryPayloadRecovered(
  db: admin.firestore.Firestore,
  contactId: string
): Promise<void> {
  const ref = db.collection(CONTACT_RETRY_PAYLOADS).doc(contactId);
  const snap = await ref.get();
  if (!snap.exists) {
    return;
  }
  const deleteAfterMs = Date.now() + RETRY_RECOVERED_RETENTION_MS;
  await ref.update({
    status: 'recovered',
    recoveredAt: admin.firestore.FieldValue.serverTimestamp(),
    deleteAfter: admin.firestore.Timestamp.fromMillis(deleteAfterMs),
  });
}

/**
 * Cleanup: delete docs where deleteAfter <= now
 * (recovered + 1h retention, exhausted, or pending past 48h TTL).
 */
export async function cleanupExpiredRetryPayloads(
  db: admin.firestore.Firestore,
  limit = 100
): Promise<{ deleted: number }> {
  const now = admin.firestore.Timestamp.now();
  const snap = await db
    .collection(CONTACT_RETRY_PAYLOADS)
    .where('deleteAfter', '<=', now)
    .limit(limit)
    .get();

  if (snap.empty) {
    return { deleted: 0 };
  }

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return { deleted: snap.size };
}
