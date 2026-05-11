#!/usr/bin/env node

/**
 * Diagnostic script to check ION image pipeline configuration and ion connectivity
 * Usage: node scripts/diagnose-image-pipeline.js
 */

const ion_HOST = process.env.ion_HOST || 'http://localhost:8188';
const ion_FETCH_HOST = process.env.ion_FETCH_HOST || ion_HOST;
const ion_MOCK = ['1', 'true', 'yes', 'on'].includes(String(process.env.ion_MOCK || 'true').trim().toLowerCase());
const ion_REQUEST_TIMEOUT = Number(process.env.ion_REQUEST_TIMEOUT_MS || 120000);

console.log('🔍 ION Image Pipeline Diagnostic Report\n');
console.log('='.repeat(60));

// Configuration Section
console.log('\n📋 Configuration:');
console.log(`  ion_HOST: ${ion_HOST}`);
console.log(`  ion_FETCH_HOST: ${ion_FETCH_HOST}`);
console.log(`  ion_MOCK: ${ion_MOCK ? '✅ YES (using mock client)' : '❌ NO (using real ion)'}`);
console.log(`  ion_REQUEST_TIMEOUT_MS: ${ion_REQUEST_TIMEOUT}`);

// Gateway Section
console.log('\n🔌 Gateway Configuration:');
if (ion_MOCK) {
  console.log(`  ✅ Using MockionClient`);
  console.log(`     - Generates mock PNG images for testing`);
  console.log(`     - No external ion connection required`);
  console.log(`     - Pipeline should NOT use fallback`);
} else {
  console.log(`  ❌ Using Real ion Client`);
  console.log(`     - Requires ion running at: ${ion_FETCH_HOST}`);
  console.log(`     - If ion is down or unreachable, will trigger fallback to SDXL`);
}

// Connectivity Test
async function testionConnectivity() {
  if (ion_MOCK) {
    console.log('\n✅ Mock mode - no connectivity test needed');
    return;
  }

  console.log('\n🌐 Testing ion Connectivity...');
  
  const endpoints = [
    { path: '/queue', name: 'Queue Endpoint' },
    { path: '/object_info', name: 'Object Info Endpoint' },
    { path: '/prompt', name: 'Prompt Endpoint' }
  ];

  for (const { path, name } of endpoints) {
    try {
      const url = `${ion_FETCH_HOST}${path}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: path === '/prompt' ? 'POST' : 'GET',
        headers: path === '/prompt' ? { 'Content-Type': 'application/json' } : {},
        body: path === '/prompt' ? JSON.stringify({ prompt: {} }) : undefined,
        signal: controller.signal
      }).catch(err => {
        clearTimeout(timeoutId);
        throw err;
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || response.status === 400) {
        console.log(`  ✅ ${name}: Reachable (${response.status})`);
      } else {
        console.log(`  ⚠️  ${name}: Returned ${response.status} (may be permission issue)`);
      }
    } catch (err) {
      console.log(`  ❌ ${name}: ${err.message}`);
    }
  }
}

// Pipeline Behavior Section
console.log('\n🔄 Pipeline Behavior:');
console.log(`  When image request arrives:`);
console.log(`    1. Safe.tensor governance is bootstrapped`);
console.log(`    2. Gateway is created (mock or real ion)`);
console.log(`    3. Gateway health check is performed`);
console.log(`    4. If healthy: Full ION pipeline executes`);
console.log(`    5. If unhealthy: Falls back to SDXL (@cf/stabilityai/stable-diffusion-xl-base-1.0)`);

console.log(`\n  Current setup will:`);
if (ion_MOCK) {
  console.log(`    ✅ Use MockionClient (always succeeds)`);
  console.log(`    ✅ Response will have gateway: 'mock'`);
  console.log(`    ✅ Should NOT show 'ai-direct-fallback' in metadata`);
} else {
  console.log(`    Use Real ion at ${ion_FETCH_HOST}`);
  console.log(`    If ion is down or returns 403:`);
  console.log(`      ❌ Response will have gateway: 'ai-direct-fallback'`);
  console.log(`      ❌ Will use SDXL fallback instead of ION pipeline`);
}

// Response Metadata Section
console.log('\n📊 Response Metadata to Check:');
console.log(`  Look for in the response metadata.pipeline.gateway:`);
if (ion_MOCK) {
  console.log(`    ✅ "mock" or "ion" → Full ION pipeline`);
  console.log(`    ❌ "ai-direct-fallback" → Error (shouldn't happen in mock mode)`);
} else {
  console.log(`    ✅ "ion" → Full ION pipeline used`);
  console.log(`    ❌ "ai-direct-fallback" → ion was unavailable`);
}

// Troubleshooting Section
console.log('\n🔧 Troubleshooting:');
if (ion_MOCK) {
  console.log(`  Mock mode is enabled. Expected behavior:`);
  console.log(`    - All image requests should use the full pipeline`);
  console.log(`    - Response should have gateway: 'mock'`);
  console.log(`    - If seeing 'ai-direct-fallback', check handler code`);
} else {
  console.log(`  Real ion mode. If seeing 'ai-direct-fallback':`);
  console.log(`    1. Check if ion is running: curl ${ion_FETCH_HOST}/queue`);
  console.log(`    2. Check if firewall is blocking: ${ion_FETCH_HOST}`);
  console.log(`    3. Check /prompt endpoint: curl -X POST ${ion_FETCH_HOST}/prompt`);
  console.log(`    4. Check logs for E_ion_DOWN or 403 errors`);
}

console.log('\n📝 Logs to Check:');
console.log(`  Enable debug logging in handler and search for:`);
console.log(`    - "ion_image_pipeline_start" → Request starting`);
console.log(`    - "ion_image_pipeline_success" → Full pipeline succeeded`);
console.log(`    - "ion_image_pipeline_error" → Pipeline failed`);
console.log(`    - "ion_image_pipeline_fallback_triggered" → Using SDXL fallback`);

console.log('\n' + '='.repeat(60));

// Run connectivity test if not in mock mode
testionConnectivity().catch(err => {
  console.error('Diagnostic test error:', err.message);
});
