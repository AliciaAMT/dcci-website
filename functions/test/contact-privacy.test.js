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

if (!process.exitCode) {
  console.log('All contact privacy unit tests passed.');
}
