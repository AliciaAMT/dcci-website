/**
 * Firebase Admin SDK initializer (server-only)
 *
 * This module initializes Firebase Admin SDK using credentials from process.env.
 * It is designed to work only in server-side contexts (Astro build-time, API routes).
 *
 * DO NOT import this in client-side code.
 *
 * SECURITY: firebase-admin is a Node.js-only module and will fail if bundled for client.
 * Only import this in Astro frontmatter (server-side) or API routes.
 *
 * Credential preference:
 * 1. FIREBASE_SERVICE_ACCOUNT — full service-account JSON (GitHub Actions)
 * 2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (local fallback)
 *
 * Never log credential values.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let firestoreAdminInstance: Firestore | null = null;

interface AdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Resolve Admin credentials without logging secret values.
 */
function resolveAdminCredentials(): AdminCredentials {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountJson && serviceAccountJson.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serviceAccountJson);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT JSON must be an object.');
    }

    const obj = parsed as Record<string, unknown>;
    const projectId = obj.project_id;
    const clientEmail = obj.client_email;
    const privateKeyRaw = obj.private_key;

    if (typeof projectId !== 'string' || !projectId.trim()) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is missing project_id.');
    }
    if (typeof clientEmail !== 'string' || !clientEmail.trim()) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is missing client_email.');
    }
    if (typeof privateKeyRaw !== 'string' || !privateKeyRaw.trim()) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is missing private_key.');
    }

    return {
      projectId: projectId.trim(),
      clientEmail: clientEmail.trim(),
      privateKey: privateKeyRaw.replace(/\\n/g, '\n')
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT ' +
        '(preferred), or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY for local use.'
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n')
  };
}

/**
 * Initialize Firebase Admin SDK using credentials from process.env.
 * Initializes only once (checks admin.apps.length).
 */
function initializeFirebaseAdmin(): Firestore {
  if (firestoreAdminInstance) {
    return firestoreAdminInstance;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firestoreAdminInstance = getFirestore(existingApps[0]);
    return firestoreAdminInstance;
  }

  const { projectId, clientEmail, privateKey } = resolveAdminCredentials();

  try {
    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      }),
      projectId
    });

    firestoreAdminInstance = getFirestore(app);
    return firestoreAdminInstance;
  } catch {
    throw new Error('Failed to initialize Firebase Admin SDK.');
  }
}

/**
 * Get Firestore Admin instance (lazy initialization)
 *
 * This is initialized on first access and reused for subsequent calls.
 * Safe to import in Astro frontmatter and server-side contexts only.
 *
 * Usage in Astro pages:
 * ---
 * import { getFirestoreAdmin } from '../lib/firebaseAdmin';
 * const db = getFirestoreAdmin();
 * ---
 */
export function getFirestoreAdmin(): Firestore {
  return initializeFirebaseAdmin();
}

/**
 * Exported Firestore Admin instance (for backward compatibility)
 *
 * @deprecated Use getFirestoreAdmin() instead for explicit lazy loading
 */
export const firestoreAdmin = initializeFirebaseAdmin();
