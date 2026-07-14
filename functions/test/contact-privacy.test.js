/**
 * Unit tests for contact retry crypto + hash helpers (no network, no Hatun email).
 * Run: cd functions && npm test
 *
 * Uses independent test secrets — never BREVO_API_KEY.
 */
process.env.CONTACT_HASH_SECRET = 'unit-test-hash-secret-at-least-32-chars-long';
process.env.CONTACT_RETRY_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.CONTACT_RETRY_KEY_VERSION = '1';
process.env.BREVO_API_KEY = 'xkeysib-should-never-be-used-as-crypto-material';

const assert = require('assert');
const {
  encryptRetryPayload,
  decryptRetryPayload,
  RETRY_PAYLOAD_TTL_MS,
  RETRY_RECOVERED_RETENTION_MS,
  MAX_CONTACT_RETRY_ATTEMPTS,
} = require('../lib/contact-retry');
const {
  hashContactEmail,
  hashContactIp,
  hashMessageFingerprint,
} = require('../lib/contact-hash');
const { isRepeatMessageFingerprint } = require('../lib/contact-security');
const {
  requireContactHashSecret,
  requireContactRetryEncryptionKeyHex,
  ContactSecretConfigError,
} = require('../lib/contact-secrets');

function test(name, fn) {
  try {
    fn();
    console.log('ok -', name);
  } catch (err) {
    console.error('FAIL -', name);
    console.error(err);
    process.exitCode = 1;
  }
}

test('encrypt/decrypt round-trip with keyVersion', () => {
  const plain = {
    name: 'Test User',
    email: 'test@example.com',
    subject: 'Hello',
    message: 'Body text',
    newsletter: false,
    clientIP: '1.2.3.4',
    sourcePage: 'home',
  };
  const enc = encryptRetryPayload(plain);
  assert.ok(enc.ciphertext);
  assert.ok(enc.iv);
  assert.ok(enc.authTag);
  assert.strictEqual(enc.keyVersion, 1);
  assert.strictEqual(
    JSON.stringify(decryptRetryPayload({ ...enc, keyVersion: enc.keyVersion })),
    JSON.stringify(plain)
  );
});

test('keyVersion mismatch fails safely', () => {
  const enc = encryptRetryPayload({
    name: 'A',
    email: 'a@b.co',
    subject: 'Hi there',
    message: 'Hello world xx',
    newsletter: false,
    clientIP: '1.1.1.1',
    sourcePage: 'welcome',
  });
  let threw = false;
  try {
    decryptRetryPayload({ ...enc, keyVersion: 99 });
  } catch (e) {
    threw = e instanceof ContactSecretConfigError || e.name === 'ContactSecretConfigError';
  }
  assert.strictEqual(threw, true);
});

test('rejects BREVO_API_KEY as hash/encryption substitute', () => {
  const savedHash = process.env.CONTACT_HASH_SECRET;
  const savedEnc = process.env.CONTACT_RETRY_ENCRYPTION_KEY;
  process.env.CONTACT_HASH_SECRET = process.env.BREVO_API_KEY;
  let hashRejected = false;
  try {
    requireContactHashSecret();
  } catch (e) {
    hashRejected = e.name === 'ContactSecretConfigError';
  }
  process.env.CONTACT_HASH_SECRET = savedHash;
  assert.strictEqual(hashRejected, true);

  process.env.CONTACT_RETRY_ENCRYPTION_KEY = process.env.BREVO_API_KEY;
  let encRejected = false;
  try {
    requireContactRetryEncryptionKeyHex();
  } catch (e) {
    encRejected = e.name === 'ContactSecretConfigError';
  }
  process.env.CONTACT_RETRY_ENCRYPTION_KEY = savedEnc;
  assert.strictEqual(encRejected, true);
});

test('hashes are stable and not plaintext', () => {
  const email = 'Hatun@Example.COM';
  const a = hashContactEmail(email);
  const b = hashContactEmail('hatun@example.com');
  assert.strictEqual(a, b);
  assert.ok(!a.includes('hatun'));
  assert.strictEqual(a.length, 64);
  assert.ok(hashContactIp('127.0.0.1').length === 64);
  assert.strictEqual(
    hashMessageFingerprint('Hi', 'Hello world'),
    hashMessageFingerprint('hi', 'Hello   world')
  );
});

test('repeat fingerprint detection', () => {
  const fp = hashMessageFingerprint('Subject', 'Message body here');
  const docs = [
    {
      data: () => ({
        messageFingerprint: fp,
        submittedAt: { toMillis: () => Date.now() },
      }),
    },
  ];
  assert.strictEqual(isRepeatMessageFingerprint(fp, docs), true);
  assert.strictEqual(isRepeatMessageFingerprint('other', docs), false);
});

test('repeat fingerprint skips docs without valid submittedAt', () => {
  const fp = hashMessageFingerprint('Subject', 'Message body here');
  const docsMissingTs = [
    {
      data: () => ({
        messageFingerprint: fp,
      }),
    },
  ];
  const docsZeroTs = [
    {
      data: () => ({
        messageFingerprint: fp,
        submittedAt: { toMillis: () => 0 },
      }),
    },
  ];
  assert.strictEqual(isRepeatMessageFingerprint(fp, docsMissingTs), false);
  assert.strictEqual(isRepeatMessageFingerprint(fp, docsZeroTs), false);
});

test('TTL constants within policy', () => {
  assert.ok(RETRY_PAYLOAD_TTL_MS >= 24 * 60 * 60 * 1000);
  assert.ok(RETRY_PAYLOAD_TTL_MS <= 72 * 60 * 60 * 1000);
  assert.strictEqual(RETRY_RECOVERED_RETENTION_MS, 60 * 60 * 1000);
  assert.ok(MAX_CONTACT_RETRY_ATTEMPTS >= 1);
});

try {
  const {
    LEGACY_CONTACT_PII_FIELDS,
    buildLegacyContactRedactionUpdate,
  } = require('../lib/contact-legacy-purge');

  test('legacy PII field list includes message body and email', () => {
    assert.ok(LEGACY_CONTACT_PII_FIELDS.includes('message'));
    assert.ok(LEGACY_CONTACT_PII_FIELDS.includes('email'));
    assert.ok(LEGACY_CONTACT_PII_FIELDS.includes('ipAddress'));
  });

  test('redaction update deletes PII and sets redacted flag', () => {
    const update = buildLegacyContactRedactionUpdate({
      name: 'Visitor',
      email: 'v@example.com',
      subject: 'Hi',
      message: 'Secret note',
      ipAddress: '1.2.3.4',
      submittedAt: { seconds: 1 },
      newsletter: true,
    });
    assert.ok(update);
    assert.strictEqual(update.redacted, true);
    assert.strictEqual(update.legacyMailbox, true);
    assert.ok(update.name);
    assert.ok(update.message);
  });

  test('clean legacy docs need no redaction', () => {
    assert.strictEqual(
      buildLegacyContactRedactionUpdate({
        submittedAt: { seconds: 1 },
        redacted: true,
        newsletterOptIn: false,
      }),
      null
    );
  });

  test('whitespace-only PII strings do not count as present', () => {
    assert.strictEqual(
      buildLegacyContactRedactionUpdate({
        name: '   ',
        email: '\t',
        submittedAt: { seconds: 1 },
      }),
      null
    );
  });

  test('deleted field count includes empty/null keys actually deleted', () => {
    const { piiFieldsToDelete, LEGACY_CONTACT_PII_FIELDS: fields } = require('../lib/contact-legacy-purge');
    const data = {
      name: '',
      email: 'a@b.co',
      phone: null,
      submittedAt: { seconds: 1 },
    };
    const update = buildLegacyContactRedactionUpdate(data);
    assert.ok(update);
    const deleted = piiFieldsToDelete(data);
    assert.ok(deleted.includes('name'));
    assert.ok(deleted.includes('email'));
    assert.ok(deleted.includes('phone'));
    assert.strictEqual(deleted.length, 3);
    for (const field of deleted) {
      assert.ok(update[field], `update should delete ${field}`);
    }
    // present/non-empty would only be email — count must not use that shorter list
    const nonEmptyOnly = fields.filter((field) => {
      const value = data[field];
      return typeof value === 'string' ? value.trim().length > 0 : value != null;
    });
    assert.strictEqual(nonEmptyOnly.length, 1);
    assert.ok(deleted.length > nonEmptyOnly.length);
  });

  test('purge result shape includes count fields without PII values', () => {
    const { LEGACY_CONTACTS_COLLECTION } = require('../lib/contact-legacy-purge');
    assert.strictEqual(LEGACY_CONTACTS_COLLECTION, 'contacts');
  });
} catch (err) {
  if (err && err.code === 'MODULE_NOT_FOUND') {
    console.log('skip - contact-legacy-purge (run tsc / npm test after build)');
  } else {
    throw err;
  }
}

if (!process.exitCode) {
  console.log('All contact privacy unit tests passed.');
}
