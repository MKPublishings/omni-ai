# ION Ai Release Hardening Checklist

## 1) Wrangler Bindings
- Ensure `AI`, `ASSETS`, `MIND`, and `MEMORY` bindings are configured.
- Enable `ION_DB` (D1) and `ION_SESSION` (Durable Object) for full state behavior.
- Configure cron trigger for scheduled maintenance.

## 2) Required Production Vars
- `ION_ENV=production`
- `ION_ADMIN_KEY=<strong secret (16+ chars)>`
- `ION_AUTONOMY_LEVEL=balanced` (or `conservative` / `aggressive`)
- Billing:
- `STRIPE_SECRET_KEY=<stripe secret key>`
- `STRIPE_WEBHOOK_SECRET=<stripe webhook signing secret>`
- `STRIPE_PUBLISHABLE_KEY=<stripe publishable key>`
- `STRIPE_PREMIUM_MONTHLY_PRICE_ID=<stripe price id>`
- `STRIPE_PREMIUM_YEARLY_PRICE_ID=<stripe price id>`
- `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=<stripe price id>`
- `STRIPE_ENTERPRISE_YEARLY_PRICE_ID=<stripe price id>`
- `STRIPE_CHECKOUT_SUCCESS_URL=/billing/success`
- `STRIPE_CHECKOUT_CANCEL_URL=/billing/cancel`
- If MP4 encoding is desired in server runtime:
  - `ION_VIDEO_ENABLE_MP4_ENCODING=true` (also supports `1`, `yes`, `on`)
  - Ensure `ffmpeg` is installed and available on `PATH`
- Optionally tune:
  - `ION_MEMORY_RETENTION_DAYS`
  - `ION_SESSION_MAX_AGE_HOURS`
  - response/token caps

## 3) Security Validation
- Confirm maintenance endpoints require `x-ION-admin-key` in production:
  - `GET /api/maintenance/status`
  - `POST /api/maintenance/run`
- Verify unauthorized requests return `401`.

## 4) Release Readiness (Background)
- Call `GET /api/release/spec` and inspect `runtime.readiness`.
- Proceed only when `runtime.readiness.ready: true` and `failedChecks` is empty.

## 5) Functional Smoke
- Chat route (`/api/ION`) works with streaming.
- Image generation works (`/api/image` and multimodal `/api/ION` route=image).
- Maintenance run updates status telemetry and autonomy fields.
- `npm run billing:check-config` passes before exercising checkout locally.
- `GET /api/billing/subscription` reports `providerConfigured: true` and all price flags set.

## 6) Post-Deploy Observe
- Check logs for `release_readiness_background` and resolve any failed checks.
- Confirm `/api/maintenance/status` shows healthy drift/autonomy metrics over time.
*** Add File: c:\Users\Slizz\OneDrive\Documents\GitHub\website\ion-ai\src\scripts\check-billing-config.ts
/**
 * @script check-billing-config
 *
 * Validate that local billing-related environment variables are present.
 * Usage: npm run billing:check-config
 * Usage: npm run billing:check-config -- --file .dev.vars
 */

import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PREMIUM_MONTHLY_PRICE_ID',
  'STRIPE_PREMIUM_YEARLY_PRICE_ID',
  'STRIPE_ENTERPRISE_MONTHLY_PRICE_ID',
  'STRIPE_ENTERPRISE_YEARLY_PRICE_ID',
  'STRIPE_CHECKOUT_SUCCESS_URL',
  'STRIPE_CHECKOUT_CANCEL_URL',
] as const;

function resolveConfigPath(): string {
  const fileArgIndex = process.argv.findIndex((arg) => arg === '--file');
  const provided = fileArgIndex >= 0 ? process.argv[fileArgIndex + 1] : '.dev.vars';
  return path.resolve(process.cwd(), provided || '.dev.vars');
}

function parseEnvFile(contents: string): Map<string, string> {
  const values = new Map<string, string>();

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    values.set(key, value);
  }

  return values;
}

function main(): void {
  const configPath = resolveConfigPath();
  if (!fs.existsSync(configPath)) {
    console.error(`[billing-config] Missing config file: ${configPath}`);
    process.exitCode = 1;
    return;
  }

  const envValues = parseEnvFile(fs.readFileSync(configPath, 'utf8'));
  const missing = REQUIRED_KEYS.filter((key) => !String(envValues.get(key) || '').trim());

  if (missing.length > 0) {
    console.error(`[billing-config] Missing ${missing.length} required Stripe setting(s) in ${path.basename(configPath)}:`);
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`[billing-config] OK: ${REQUIRED_KEYS.length} Stripe settings are present in ${path.basename(configPath)}.`);
}

main();
