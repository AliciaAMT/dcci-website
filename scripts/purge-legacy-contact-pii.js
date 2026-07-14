/**
 * Local Admin SDK purge of legacy `contacts` PII (no Cloud Function secret needed).
 *
 * Dry-run (default — no writes):
 *   node scripts/purge-legacy-contact-pii.js
 *   node scripts/purge-legacy-contact-pii.js --dry-run
 *
 * Live redaction (explicit opt-in only):
 *   node scripts/purge-legacy-contact-pii.js --confirm-live
 *
 * Requires ADC / `gcloud auth application-default login` for project dcci-ministries.
 */
'use strict';

const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'dcci-ministries';
const confirmLive = process.argv.includes('--confirm-live');
const dryRun = !confirmLive;

const LEGACY_CONTACT_PII_FIELDS = [
  'name',
  'email',
  'subject',
  'message',
  'ipAddress',
  'userAgent',
  'phone',
  'company',
];

function hasLegacyPii(data) {
  return LEGACY_CONTACT_PII_FIELDS.some((field) => {
    const value = data[field];
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
  });
}

function piiFieldsPresent(data) {
  return LEGACY_CONTACT_PII_FIELDS.filter((field) => {
    const value = data[field];
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
  });
}

/** Must match deletion: any defined key, including empty string / null. */
function piiFieldsToDelete(data) {
  return LEGACY_CONTACT_PII_FIELDS.filter((field) => data[field] !== undefined);
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  const db = admin.firestore();

  let snapshot;
  try {
    snapshot = await db.collection('contacts').orderBy('submittedAt', 'asc').get();
  } catch {
    snapshot = await db.collection('contacts').get();
  }

  let withPii = 0;
  let skipped = 0;
  let redacted = 0;
  let deletedFields = 0;
  let failed = 0;
  const documentIdsWithPii = [];
  const unexpectedSubcollectionPaths = [];
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const fields = piiFieldsPresent(data);
      if (fields.length === 0) {
        skipped += 1;
        continue;
      }
      withPii += 1;
      documentIdsWithPii.push(doc.id);

      const subcollections = await doc.ref.listCollections();
      if (subcollections.length > 0) {
        failed += 1;
        for (const col of subcollections) {
          unexpectedSubcollectionPaths.push(`contacts/${doc.id}/${col.id}`);
        }
        continue;
      }

      if (dryRun) continue;

      const update = {
        redacted: true,
        redactedAt: admin.firestore.FieldValue.serverTimestamp(),
        legacyMailbox: true,
      };
      const fieldsToDelete = piiFieldsToDelete(data);
      for (const field of fieldsToDelete) {
        update[field] = admin.firestore.FieldValue.delete();
      }
      batch.update(doc.ref, update);
      batchCount += 1;
      redacted += 1;
      deletedFields += fieldsToDelete.length;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    } catch {
      failed += 1;
    }
  }

  if (!dryRun && batchCount > 0) {
    await batch.commit();
  }

  console.log(
    JSON.stringify(
      {
        projectId: PROJECT_ID,
        collectionPath: 'contacts',
        fieldsTargeted: LEGACY_CONTACT_PII_FIELDS,
        dateRange: null,
        dryRun,
        examined: snapshot.size,
        withPii,
        redacted,
        deletedDocuments: 0,
        deletedFields,
        skipped,
        failed,
        documentIdsWithPii,
        unexpectedSubcollectionPaths,
      },
      null,
      2
    )
  );

  if (dryRun) {
    console.error('Dry-run only. Pass --confirm-live for permanent field redaction (after review).');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
