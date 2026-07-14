import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';

/** Plaintext fields that must never remain on legacy `contacts` docs. */
export const LEGACY_CONTACT_PII_FIELDS = [
  'name',
  'email',
  'subject',
  'message',
  'ipAddress',
  'userAgent',
  'phone',
  'company',
] as const;

/** Sole collection this purge touches. No subcollections are expected. */
export const LEGACY_CONTACTS_COLLECTION = 'contacts';

export interface PurgeLegacyContactsOptions {
  dryRun: boolean;
  /** Max docs to process this run (0 / undefined = no limit). */
  limit?: number;
}

export interface PurgeLegacyContactsResult {
  collectionPath: string;
  fieldsTargeted: readonly string[];
  /** Always null — this purge has no date filter; it examines matching docs in the collection. */
  dateRange: null;
  examined: number;
  /** Docs that currently contain at least one PII field. */
  withPii: number;
  /** Docs with PII fields actually updated (0 when dryRun). */
  redacted: number;
  /** Whole documents deleted — always 0; purge redacts fields only. */
  deletedDocuments: number;
  /** PII field removals applied (0 when dryRun). */
  deletedFields: number;
  /** Docs already clean (no PII fields). */
  skipped: number;
  /** Docs skipped because of errors or unexpected subcollections. */
  failed: number;
  dryRun: boolean;
  /** Document IDs under `contacts` that still have PII (no field values). */
  documentIdsWithPii: string[];
  /** Unexpected subcollection IDs found (paths only; empty when none). */
  unexpectedSubcollectionPaths: string[];
}

function hasLegacyPii(data: FirebaseFirestore.DocumentData): boolean {
  return LEGACY_CONTACT_PII_FIELDS.some((field) => {
    const value = data[field];
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
  });
}

/** Fields with non-empty / non-null PII (detection / withPii). */
function piiFieldsPresent(data: FirebaseFirestore.DocumentData): string[] {
  return LEGACY_CONTACT_PII_FIELDS.filter((field) => {
    const value = data[field];
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
  });
}

/**
 * Fields that will be removed by redaction (must match the deletion loop:
 * any key that exists on the doc, including empty string / null).
 */
export function piiFieldsToDelete(data: FirebaseFirestore.DocumentData): string[] {
  return LEGACY_CONTACT_PII_FIELDS.filter((field) => data[field] !== undefined);
}

/**
 * Redact visitor PII from a legacy `contacts` document while keeping
 * count/audit metadata (submittedAt, newsletter, delivery flags).
 */
export function buildLegacyContactRedactionUpdate(
  data: FirebaseFirestore.DocumentData
): Record<string, unknown> | null {
  if (!hasLegacyPii(data)) {
    return null;
  }

  const update: Record<string, unknown> = {
    redacted: true,
    redactedAt: admin.firestore.FieldValue.serverTimestamp(),
    legacyMailbox: true,
  };

  for (const field of piiFieldsToDelete(data)) {
    update[field] = admin.firestore.FieldValue.delete();
  }

  return update;
}

/**
 * Strip plaintext visitor identity and message bodies from legacy `contacts`.
 * Safe to re-run. Does not touch accounts, comments, config, delivery events,
 * newsletter `subscribers`, or encrypted retry payloads.
 */
export async function purgeLegacyContactPii(
  db: Firestore,
  options: PurgeLegacyContactsOptions
): Promise<PurgeLegacyContactsResult> {
  const limit = options.limit && options.limit > 0 ? options.limit : undefined;
  let snapshot: FirebaseFirestore.QuerySnapshot;

  try {
    let q: FirebaseFirestore.Query = db
      .collection(LEGACY_CONTACTS_COLLECTION)
      .orderBy('submittedAt', 'asc');
    if (limit) {
      q = q.limit(limit);
    }
    snapshot = await q.get();
  } catch {
    let q: FirebaseFirestore.Query = db.collection(LEGACY_CONTACTS_COLLECTION);
    if (limit) {
      q = q.limit(limit);
    }
    snapshot = await q.get();
  }

  const result: PurgeLegacyContactsResult = {
    collectionPath: LEGACY_CONTACTS_COLLECTION,
    fieldsTargeted: LEGACY_CONTACT_PII_FIELDS,
    dateRange: null,
    examined: snapshot.size,
    withPii: 0,
    redacted: 0,
    deletedDocuments: 0,
    deletedFields: 0,
    skipped: 0,
    failed: 0,
    dryRun: options.dryRun,
    documentIdsWithPii: [],
    unexpectedSubcollectionPaths: [],
  };

  const batchSize = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const fields = piiFieldsPresent(data);
      if (fields.length === 0) {
        result.skipped += 1;
        continue;
      }

      result.withPii += 1;
      result.documentIdsWithPii.push(doc.id);

      const subcollections = await doc.ref.listCollections();
      if (subcollections.length > 0) {
        result.failed += 1;
        for (const col of subcollections) {
          const path = `${LEGACY_CONTACTS_COLLECTION}/${doc.id}/${col.id}`;
          if (!result.unexpectedSubcollectionPaths.includes(path)) {
            result.unexpectedSubcollectionPaths.push(path);
          }
        }
        continue;
      }

      if (options.dryRun) {
        continue;
      }

      // Same PII predicate as piiFieldsPresent / hasLegacyPii — null here is an
      // internal inconsistency, not "already clean" (already counted in withPii).
      const update = buildLegacyContactRedactionUpdate(data);
      if (!update) {
        result.failed += 1;
        continue;
      }

      batch.update(doc.ref, update);
      batchCount += 1;
      result.redacted += 1;
      result.deletedFields += piiFieldsToDelete(data).length;

      if (batchCount >= batchSize) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    } catch {
      result.failed += 1;
    }
  }

  if (!options.dryRun && batchCount > 0) {
    await batch.commit();
  }

  return result;
}
