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