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

function buildVerificationEmailContent(input: VerificationEmailInput): { subject: string; text: string; html: string } {
  const greetingName = String(input.displayName || '').trim() || 'there';
  const safeName = escapeHtml(greetingName);
  const safeUrl = escapeHtml(input.verificationUrl);
  const subject = 'Verify your Ionirix account';
  const text = [
    `Hi ${greetingName},`,
    '',
    'Welcome to Ionirix — your access point to sovereign, high-integrity AI systems.',
    '',
    'To activate your account, please verify your email address by using the secure link below:',
    '',
    input.verificationUrl,
    '',
    'If you did not create an Ionirix account, you can safely ignore this message.',
    '',
    'Ionirix LLC',
    'Sovereign AI Infrastructure',
  ].join('\n');
  const html = `
    <div style="background:#061018;padding:32px 18px;font-family:'Segoe UI',Arial,sans-serif;color:#e8eef7;">
      <div style="max-width:560px;margin:0 auto;border-radius:28px;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#0d1726 0%,#09111c 100%);padding:36px 32px;box-shadow:0 32px 90px rgba(0,0,0,0.4);">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:16px;background:#6be5ff;color:#061018;font-size:13px;font-weight:700;letter-spacing:0.14em;">IX</div>
        <p style="margin:18px 0 0;font-size:11px;line-height:1.4;letter-spacing:0.28em;text-transform:uppercase;color:rgba(232,238,247,0.52);">Ionirix</p>
        <h1 style="margin:10px 0 0;font-size:30px;line-height:1.15;color:#f7fbff;">Verify your account</h1>
        <p style="margin:22px 0 0;font-size:15px;line-height:1.75;color:rgba(232,238,247,0.78);">Hi ${safeName},</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.75;color:rgba(232,238,247,0.78);">Welcome to Ionirix — your access point to sovereign, high-integrity AI systems.</p>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.75;color:rgba(232,238,247,0.78);">To activate your account, please verify your email address by using the secure link below.</p>
        <div style="margin-top:28px;">
          <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#0f8cff;color:#ffffff;text-decoration:none;font-weight:600;letter-spacing:0.01em;">Verify your Ionirix account</a>
        </div>
        <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:rgba(232,238,247,0.54);">If the button does not open, copy and paste this URL into your browser:</p>
        <p style="margin:12px 0 0;word-break:break-all;font-size:12px;line-height:1.7;color:#7be5ff;">${safeUrl}</p>
        <p style="margin:22px 0 0;font-size:13px;line-height:1.75;color:rgba(232,238,247,0.56);">If you did not create an Ionirix account, you can safely ignore this message.</p>
        <p style="margin:26px 0 0;font-size:13px;line-height:1.7;color:rgba(232,238,247,0.66);">Ionirix LLC<br/>Sovereign AI Infrastructure</p>
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
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: env.EMAIL_REPLY_TO ? [env.EMAIL_REPLY_TO] : undefined,
      subject: content.subject,
      html: content.html,
      text: content.text,
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
      from: { email: from },
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

  try {
    if (String(env.RESEND_API_KEY || '').trim()) {
      return await sendViaResend(env, input);
    }

    if (transport === 'mailchannels' || (transport === '' && String(env.EMAIL_FROM || '').trim())) {
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