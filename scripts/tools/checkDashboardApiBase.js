const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PROBE_PATH = '/api/gateway/status';
const DEFAULT_TIMEOUT_MS = 10000;

function readEnvFile() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const entries = {};
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    entries[key] = value;
  }

  return entries;
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return '';
  }

  return process.argv[index + 1] || '';
}

function normalizeBaseUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed);
  } catch {
    throw new Error(`NEXT_PUBLIC_ION_API_URL is not a valid absolute URL: ${trimmed}`);
  }
}

function buildErrorMessage(error, baseUrl, timeoutMs) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : null;
  const causeCode = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code || '') : '';

  if (message.includes('This operation was aborted')) {
    return `Timed out after ${timeoutMs}ms while probing ${baseUrl.origin}${DEFAULT_PROBE_PATH}.`;
  }

  if (causeCode === 'ENOTFOUND' || causeCode === 'EAI_AGAIN') {
    return `DNS lookup failed for ${baseUrl.hostname}. NEXT_PUBLIC_ION_API_URL points to an unreachable host.`;
  }

  if (causeCode === 'ECONNREFUSED') {
    return `Connection refused by ${baseUrl.origin}. The worker is not accepting requests.`;
  }

  return `Probe failed for ${baseUrl.origin}${DEFAULT_PROBE_PATH}: ${message}`;
}

async function main() {
  const explicitUrl = readArg('--url');
  const envFile = readEnvFile();
  const configuredUrl = explicitUrl || envFile.NEXT_PUBLIC_ION_API_URL || process.env.NEXT_PUBLIC_ION_API_URL || '';
  const timeoutMs = Number(readArg('--timeout') || process.env.ION_API_CHECK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const baseUrl = normalizeBaseUrl(configuredUrl);

  if (!baseUrl) {
    console.error('NEXT_PUBLIC_ION_API_URL is not set. Set it to the deployed worker origin before validating the dashboard API.');
    process.exit(1);
  }

  const probeUrl = new URL(DEFAULT_PROBE_PATH, baseUrl);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  console.log(`Checking dashboard API target: ${probeUrl.toString()}`);

  try {
    const response = await fetch(probeUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      console.error(`Dashboard API probe failed with HTTP ${response.status} ${response.statusText}.`);
      if (text) {
        console.error(text.slice(0, 400));
      }
      process.exit(1);
    }

    console.log(`Dashboard API probe succeeded with HTTP ${response.status}.`);
    if (payload && typeof payload === 'object') {
      console.log(JSON.stringify(payload, null, 2));
    }
  } catch (error) {
    console.error(buildErrorMessage(error, baseUrl, timeoutMs));
    process.exit(1);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

void main();