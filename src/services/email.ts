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
  error?: string;
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
  const safeName = escapeHtml(input.displayName || 'there');
  const safeUrl = escapeHtml(input.verificationUrl);
  const subject = 'Verify your Ionirix email';
  const text = [
    `Hello ${input.displayName || 'there'},`,
    '',
    'Verify your email to finish activating your Ionirix account.',
    '',
    input.verificationUrl,
    '',
    'This link expires in 24 hours.',
  ].join('\n');
  const html = `
    <div style="background:#071018;padding:32px 20px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e7edf7;">
      <div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,rgba(16,25,43,0.96),rgba(10,16,28,0.98));border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px;box-shadow:0 30px 80px rgba(0,0,0,0.35);">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:14px;background:#34d6ff;color:#071018;font-weight:700;font-size:14px;letter-spacing:0.08em;">IX</div>
        <p style="margin:18px 0 0;color:rgba(231,237,247,0.62);font-size:12px;letter-spacing:0.24em;text-transform:uppercase;">Ionirix</p>
        <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;color:#f7fbff;">Verify your email</h1>
        <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:rgba(231,237,247,0.78);">Hello ${safeName}, activate your Ionirix account by verifying your email address.</p>
        <div style="margin-top:28px;">
          <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#2d8cff;color:#ffffff;text-decoration:none;font-weight:600;">Verify email</a>
        </div>
        <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:rgba(231,237,247,0.58);">This link expires in 24 hours. If the button does not open, copy and paste this URL into your browser:</p>
        <p style="margin:12px 0 0;word-break:break-all;font-size:12px;line-height:1.7;color:#7be5ff;">${safeUrl}</p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

async function sendViaResend(env: VerificationMailEnv, input: VerificationEmailInput): Promise<VerificationEmailResult> {
  const from = String(env.EMAIL_FROM || '').trim();
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  if (!from || !apiKey) {
    return { delivered: false, delivery: 'manual-link', provider: 'manual-link', error: 'Resend configuration is incomplete.' };
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
    return { delivered: false, delivery: 'manual-link', provider: 'manual-link', error: payload };
  }

  return { delivered: true, delivery: 'email', provider: 'resend' };
}

async function sendViaMailchannels(env: VerificationMailEnv, input: VerificationEmailInput): Promise<VerificationEmailResult> {
  const from = String(env.EMAIL_FROM || '').trim();
  if (!from) {
    return { delivered: false, delivery: 'manual-link', provider: 'manual-link', error: 'MailChannels configuration is incomplete.' };
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
    return { delivered: false, delivery: 'manual-link', provider: 'manual-link', error: payload };
  }

  return { delivered: true, delivery: 'email', provider: 'mailchannels' };
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
      error: error instanceof Error ? error.message : 'Verification email failed.',
    };
  }

  return { delivered: false, delivery: 'manual-link', provider: 'manual-link' };
}