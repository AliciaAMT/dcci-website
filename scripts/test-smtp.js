#!/usr/bin/env node
/**
 * Test Gmail SMTP before updating Firebase config.
 *
 * Verify only (no email sent):
 *   MAIL_PASS="xxxx xxxx xxxx xxxx" node scripts/test-smtp.js --verify-only
 *   MAIL_PASS="..." MAIL_VERIFY_ONLY=1 node scripts/test-smtp.js
 *
 * Full send test (defaults to sender inbox, not Hatun):
 *   MAIL_PASS="xxxx xxxx xxxx xxxx" node scripts/test-smtp.js
 *
 * Optional:
 *   MAIL_USER=admin@accessiblewebmedia.com
 *   MAIL_TO=admin@accessiblewebmedia.com   (override recipient for send test)
 *   MAIL_HOST=smtp.gmail.com   (default — Gmail until Brevo migration)
 *   MAIL_PORT=465              (default; use 587 for Brevo)
 */

const { createMailTransport, getSmtpSettingsFromEnv } = require('./lib/smtp-config');

const verifyOnly =
  process.argv.includes('--verify-only') ||
  process.env.MAIL_VERIFY_ONLY === '1' ||
  process.env.MAIL_VERIFY_ONLY === 'true';

const user = process.env.MAIL_USER || 'admin@accessiblewebmedia.com';
const pass = process.env.MAIL_PASS;
const to = process.env.MAIL_TO || user;

if (!pass) {
  console.error('Set MAIL_PASS to a Google App Password (not your login password).');
  console.error('Verify only: MAIL_PASS="abcd efgh ijkl mnop" node scripts/test-smtp.js --verify-only');
  process.exit(1);
}

const transport = createMailTransport({
  user,
  pass
});
const smtp = getSmtpSettingsFromEnv();

(async () => {
  try {
    await transport.verify();
    console.log('SMTP login OK for', user, `(${smtp.host}:${smtp.port})`);

    if (verifyOnly) {
      console.log('Verify-only mode — no email sent.');
      return;
    }

    const info = await transport.sendMail({
      from: `"DCCI Ministries Website" <${user}>`,
      to,
      subject: 'Contact form SMTP test',
      text: 'If you received this, Firebase mail config can be updated with the same App Password.'
    });

    console.log('Test email sent:', info.messageId);
    console.log('Check inbox:', to);
  } catch (err) {
    console.error('SMTP failed:', err.message);
    if (err.message.includes('535')) {
      console.error('\nBad credentials — create a new App Password at:');
      console.error('https://myaccount.google.com/apppasswords');
      console.error('(Sign in as', user + ')');
    }
    process.exit(1);
  }
})();
