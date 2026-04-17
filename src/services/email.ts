type VerificationMailEnv = {
  RESEND_API_KEY?: string;
  EMAIL_TRANSPORT?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  MAILCHANNELS_API_URL?: string;
};

export type VerificationDelivery = 'email' | 'manual-link';

export interface VerificationEmailInput {
  to: string;
  displayName: string;
  verificationUrl: string;
}

export interface VerificationEmailResult {
  delivered: boolean;
  delivery: VerificationDelivery;
  provider: 'resend' | 'mailchannels' | 'manual-link';
  attemptedProvider?: 'resend' | 'mailchannels';
  failureStage?: 'config' | 'provider-response' | 'transport-selection' | 'exception';
  statusCode?: number;
  responseSnippet?: string;
  error?: string;
}

const DEFAULT_FROM_NAME = 'Ionirix';

function summarizeProviderPayload(value: string, maxLength = 320): string {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1))}...`
    : normalized;
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMailbox(address: string, displayName = DEFAULT_FROM_NAME): string {
  const trimmedAddress = String(address || '').trim();
  const trimmedName = String(displayName || '').trim();
  if (!trimmedAddress) {
    return '';
  }

  if (!trimmedName) {
    return trimmedAddress;
  }

  return `${trimmedName} <${trimmedAddress}>`;
}

function buildVerificationEmailContent(input: VerificationEmailInput): { subject: string; text: string; html: string } {
  const greetingName = String(input.displayName || '').trim() || 'there';
  const safeName = escapeHtml(greetingName);
  const safeUrl = escapeHtml(input.verificationUrl);
  const subject = 'Verify your email address for Ionirix';
  const text = [
    `Hi ${greetingName},`,
    '',
    'Use the link below to verify your email address and finish creating your Ionirix account.',
    '',
    'Verification link:',
    '',
    input.verificationUrl,
    '',
    'This email was sent because someone used this address to sign up for Ionirix.',
    'If that was not you, you can ignore this email.',
    '',
    'Ionirix',
    'Reply to this email if you need help.',
  ].join('\n');
  const html = `
    <div style="background:#f5f7fb;padding:24px 12px;font-family:Arial,sans-serif;color:#142033;">
      <div style="max-width:560px;margin:0 auto;border:1px solid #d8e0eb;border-radius:12px;background:#ffffff;padding:32px 28px;">
        <p style="margin:0 0 20px;font-size:12px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#5f6f86;">Ionirix</p>
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;color:#142033;">Verify your email address</h1>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#243247;">Hi ${safeName},</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#243247;">Use the button below to verify your email address and finish creating your Ionirix account.</p>
        <div style="margin:24px 0;">
          <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#0f62fe;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Verify email address</a>
        </div>
        <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#4e5d72;">If the button does not open, copy and paste this link into your browser:</p>
        <p style="margin:0 0 18px;word-break:break-all;font-size:12px;line-height:1.7;color:#0f62fe;">${safeUrl}</p>
        <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#4e5d72;">This email was sent because someone used this address to sign up for Ionirix.</p>
        <p style="margin:0;font-size:13px;line-height:1.7;color:#4e5d72;">If that was not you, you can ignore this email or reply to let us know.</p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

async function sendViaResend(env: VerificationMailEnv, input: VerificationEmailInput): Promise<VerificationEmailResult> {
  const from = String(env.EMAIL_FROM || '').trim();
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  if (!from || !apiKey) {
    return {
      delivered: false,
      delivery: 'manual-link',
      provider: 'manual-link',
      attemptedProvider: 'resend',
      failureStage: 'config',
      error: 'Resend configuration is incomplete.',
    };
  }

  const content = buildVerificationEmailContent(input);
  const fromMailbox = formatMailbox(from);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromMailbox,
      to: [input.to],
      reply_to: env.EMAIL_REPLY_TO ? [env.EMAIL_REPLY_TO] : undefined,
      subject: content.subject,
      html: content.html,
      text: content.text,
      headers: {
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => 'Unknown Resend error');
    const responseSnippet = summarizeProviderPayload(payload);
    return {
      delivered: false,
      delivery: 'manual-link',
      provider: 'manual-link',
      attemptedProvider: 'resend',
      failureStage: 'provider-response',
      statusCode: response.status,
      responseSnippet,
      error: responseSnippet || `Resend responded with status ${response.status}.`,
    };
  }

  return { delivered: true, delivery: 'email', provider: 'resend', attemptedProvider: 'resend', statusCode: response.status };
}

async function sendViaMailchannels(env: VerificationMailEnv, input: VerificationEmailInput): Promise<VerificationEmailResult> {
  const from = String(env.EMAIL_FROM || '').trim();
  if (!from) {
    return {
      delivered: false,
      delivery: 'manual-link',
      provider: 'manual-link',
      attemptedProvider: 'mailchannels',
      failureStage: 'config',
      error: 'MailChannels configuration is incomplete.',
    };
  }

  const content = buildVerificationEmailContent(input);
  const endpoint = String(env.MAILCHANNELS_API_URL || 'https://api.mailchannels.net/tx/v1/send').trim();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: input.to, name: input.displayName || undefined }],
        },
      ],
      from: { email: from, name: DEFAULT_FROM_NAME },
      reply_to: env.EMAIL_REPLY_TO ? { email: env.EMAIL_REPLY_TO } : undefined,
      subject: content.subject,
      content: [
        { type: 'text/plain', value: content.text },
        { type: 'text/html', value: content.html },
      ],
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => 'Unknown MailChannels error');
    const responseSnippet = summarizeProviderPayload(payload);
    return {
      delivered: false,
      delivery: 'manual-link',
      provider: 'manual-link',
      attemptedProvider: 'mailchannels',
      failureStage: 'provider-response',
      statusCode: response.status,
      responseSnippet,
      error: responseSnippet || `MailChannels responded with status ${response.status}.`,
    };
  }

  return { delivered: true, delivery: 'email', provider: 'mailchannels', attemptedProvider: 'mailchannels', statusCode: response.status };
}

export async function sendVerificationEmail(env: VerificationMailEnv, input: VerificationEmailInput): Promise<VerificationEmailResult> {
  const transport = String(env.EMAIL_TRANSPORT || '').trim().toLowerCase();
  const hasResendApiKey = Boolean(String(env.RESEND_API_KEY || '').trim());
  const hasEmailFrom = Boolean(String(env.EMAIL_FROM || '').trim());

  try {
    if (transport === 'resend') {
      return await sendViaResend(env, input);
    }

    if (transport === 'mailchannels') {
      return await sendViaMailchannels(env, input);
    }

    if (hasResendApiKey) {
      return await sendViaResend(env, input);
    }

    if (transport === '' && hasEmailFrom) {
      return await sendViaMailchannels(env, input);
    }
  } catch (error) {
    return {
      delivered: false,
      delivery: 'manual-link',
      provider: 'manual-link',
      failureStage: 'exception',
      error: error instanceof Error ? error.message : 'Verification email failed.',
    };
  }

  return {
    delivered: false,
    delivery: 'manual-link',
    provider: 'manual-link',
    failureStage: 'transport-selection',
    error: 'No verification email transport is configured.',
  };
}