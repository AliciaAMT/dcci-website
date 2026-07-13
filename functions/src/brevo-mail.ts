import * as https from 'https';
import {
  BREVO_API_URL,
  BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME,
} from './brevo-config';

export interface BrevoTransactionalEmailInput {
  apiKey: string;
  toEmail: string;
  toName?: string;
  replyToEmail: string;
  replyToName: string;
  subject: string;
  textContent: string;
  htmlContent: string;
}

export interface BrevoSendSuccess {
  messageId: string;
}

export class BrevoApiError extends Error {
  readonly httpStatus: number;
  readonly failureCategory: string;
  readonly sanitizedMessage: string;

  constructor(httpStatus: number, failureCategory: string, sanitizedMessage: string) {
    super(sanitizedMessage);
    this.name = 'BrevoApiError';
    this.httpStatus = httpStatus;
    this.failureCategory = failureCategory;
    this.sanitizedMessage = sanitizedMessage;
  }
}

function categorizeBrevoHttpStatus(status: number): string {
  if (status === 401 || status === 403) return 'brevo_auth';
  if (status === 400) return 'brevo_bad_request';
  if (status === 402) return 'brevo_credits';
  if (status === 429) return 'brevo_rate_limit';
  if (status >= 500) return 'brevo_server_error';
  if (status >= 400) return 'brevo_client_error';
  return 'brevo_unknown';
}

/** Strip secrets / long payloads before logging or Firestore. */
function sanitizeBrevoErrorBody(raw: string): string {
  return raw
    .replace(/xkeysib-[a-zA-Z0-9-]+/gi, '[redacted]')
    .replace(/"api[-_]?key"\s*:\s*"[^"]*"/gi, '"api-key":"[redacted]"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

function httpsJsonRequest(
  url: string,
  options: { method: string; headers: Record<string, string>; body: string }
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        method: options.method,
        headers: {
          ...options.headers,
          'Content-Length': Buffer.byteLength(options.body, 'utf8'),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0, body: data });
        });
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.write(options.body, 'utf8');
    req.end();
  });
}

/**
 * Send one transactional email via Brevo REST API.
 * Does not log the API key or full message body.
 */
export async function sendBrevoTransactionalEmail(
  input: BrevoTransactionalEmailInput
): Promise<BrevoSendSuccess> {
  if (!input.apiKey || !input.apiKey.trim()) {
    throw new BrevoApiError(0, 'brevo_missing_api_key', 'BREVO_API_KEY is not configured');
  }

  const payload = {
    sender: {
      name: BREVO_SENDER_NAME,
      email: BREVO_SENDER_EMAIL,
    },
    to: [
      {
        email: input.toEmail.trim().toLowerCase(),
        ...(input.toName ? { name: input.toName } : {}),
      },
    ],
    replyTo: {
      email: input.replyToEmail.trim().toLowerCase(),
      name: input.replyToName.trim() || 'Website visitor',
    },
    subject: input.subject,
    textContent: input.textContent,
    htmlContent: input.htmlContent,
  };

  const response = await httpsJsonRequest(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': input.apiKey.trim(),
    },
    body: JSON.stringify(payload),
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    const category = categorizeBrevoHttpStatus(response.statusCode);
    const sanitized = sanitizeBrevoErrorBody(response.body) || `Brevo HTTP ${response.statusCode}`;
    throw new BrevoApiError(response.statusCode, category, sanitized);
  }

  let messageId = '';
  try {
    const parsed = JSON.parse(response.body) as { messageId?: string };
    messageId = typeof parsed.messageId === 'string' ? parsed.messageId : '';
  } catch {
    messageId = '';
  }

  if (!messageId) {
    throw new BrevoApiError(
      response.statusCode || 200,
      'brevo_missing_message_id',
      'Brevo response missing messageId'
    );
  }

  return { messageId };
}
