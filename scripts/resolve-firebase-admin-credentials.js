/**
 * Resolve Firebase Admin credentials from env without logging secret values.
 *
 * Preference order:
 * 1. FIREBASE_SERVICE_ACCOUNT — full service-account JSON string (GitHub Actions)
 * 2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (local fallback)
 *
 * @returns {{ projectId: string, clientEmail: string, privateKey: string }}
 */
function resolveFirebaseAdminCredentials() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountJson && serviceAccountJson.trim()) {
    let parsed;
    try {
      parsed = JSON.parse(serviceAccountJson);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT JSON must be an object.');
    }

    const projectId = parsed.project_id;
    const clientEmail = parsed.client_email;
    const privateKeyRaw = parsed.private_key;

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

module.exports = { resolveFirebaseAdminCredentials };
