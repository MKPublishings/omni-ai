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
- `STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_1TN0JIBJEKcExtO66AR2kxnp`
- `STRIPE_PREMIUM_YEARLY_PRICE_ID=price_1TN0OwBJEKcExtO6XWK1617l`
- `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_1TN0SrBJEKcExtO6DpypdWEA`
- `STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_1TN0W9BJEKcExtO6hpAoVcmV`
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

## 4.5) Branding Gate
- Run `npm run check:branding` before release tagging or merge-to-main.
- Treat `ION Ai` casing as a hard gate for authored repository content.
- Do not relax the gate for historical or third-party wording unless the surface is truly external or generated and excluded through the generated-artifact policy.

## 5) Functional Smoke
- Chat route (`/api/ION`) works with streaming.
- Image generation works (`/api/image` and multimodal `/api/ION` route=image).
- Maintenance run updates status telemetry and autonomy fields.
- `npm run billing:check-config` passes before exercising checkout locally.
- `GET /api/billing/subscription` reports `providerConfigured: true` and all price flags set.

## 6) Post-Deploy Observe
- Treat `https://ionirix.com` as the canonical public route and `https://ion-ai.omni-ai.workers.dev` as the current worker alias.
- Confirm `POST /api/image` on both hosts returns `X-ION-Image-Route: image-gen-v2`.
- Confirm multimodal `/api/ION` image requests stream image payloads sourced from the v2 pipeline.
- Check logs for `release_readiness_background` and resolve any failed checks.
- Confirm `/api/maintenance/status` shows healthy drift/autonomy metrics over time.

## 6.5) Image Route Invariant
- `image-gen-v2` is the only supported worker image route.
- `POST /api/image` must not emit `X-ION-Image-Fallback` or `X-ION-Image-Fallback-Reason`.
- Multimodal `/api/ION` image requests must stream an `imageDataUrl` payload backed by v2 metadata.
- Re-run `node ./scripts/smoke/orchestratorImageAttestationSmoke.js` and confirm baseline requests return `X-ION-Image-Route: image-gen-v2` without fallback headers.
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
