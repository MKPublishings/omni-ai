#!/usr/bin/env node

/**
 * Diagnostic script to check ION image pipeline configuration and ComfyUI connectivity
 * Usage: node scripts/diagnose-image-pipeline.js
 */

const COMFYUI_HOST = process.env.COMFYUI_HOST || 'http://localhost:8188';
const COMFYUI_FETCH_HOST = process.env.COMFYUI_FETCH_HOST || COMFYUI_HOST;
const COMFYUI_MOCK = ['1', 'true', 'yes', 'on'].includes(String(process.env.COMFYUI_MOCK || 'true').trim().toLowerCase());
const COMFYUI_REQUEST_TIMEOUT = Number(process.env.COMFYUI_REQUEST_TIMEOUT_MS || 120000);

console.log('🔍 ION Image Pipeline Diagnostic Report\n');
console.log('='.repeat(60));

// Configuration Section
console.log('\n📋 Configuration:');
console.log(`  COMFYUI_HOST: ${COMFYUI_HOST}`);
console.log(`  COMFYUI_FETCH_HOST: ${COMFYUI_FETCH_HOST}`);
console.log(`  COMFYUI_MOCK: ${COMFYUI_MOCK ? '✅ YES (using mock client)' : '❌ NO (using real ComfyUI)'}`);
console.log(`  COMFYUI_REQUEST_TIMEOUT_MS: ${COMFYUI_REQUEST_TIMEOUT}`);

// Gateway Section
console.log('\n🔌 Gateway Configuration:');
if (COMFYUI_MOCK) {
  console.log(`  ✅ Using MockComfyUIClient`);
  console.log(`     - Generates mock PNG images for testing`);
  console.log(`     - No external ComfyUI connection required`);
  console.log(`     - Pipeline should NOT use fallback`);
} else {
  console.log(`  ❌ Using Real ComfyUI Client`);
  console.log(`     - Requires ComfyUI running at: ${COMFYUI_FETCH_HOST}`);
  console.log(`     - If ComfyUI is down or unreachable, will trigger fallback to SDXL`);
}

// Connectivity Test
async function testComfyUIConnectivity() {
  if (COMFYUI_MOCK) {
    console.log('\n✅ Mock mode - no connectivity test needed');
    return;
  }

  console.log('\n🌐 Testing ComfyUI Connectivity...');
  
  const endpoints = [
    { path: '/queue', name: 'Queue Endpoint' },
    { path: '/object_info', name: 'Object Info Endpoint' },
    { path: '/prompt', name: 'Prompt Endpoint' }
  ];

  for (const { path, name } of endpoints) {
    try {
      const url = `${COMFYUI_FETCH_HOST}${path}`;
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
console.log(`    2. Gateway is created (mock or real ComfyUI)`);
console.log(`    3. Gateway health check is performed`);
console.log(`    4. If healthy: Full ION pipeline executes`);
console.log(`    5. If unhealthy: Falls back to SDXL (@cf/stabilityai/stable-diffusion-xl-base-1.0)`);

console.log(`\n  Current setup will:`);
if (COMFYUI_MOCK) {
  console.log(`    ✅ Use MockComfyUIClient (always succeeds)`);
  console.log(`    ✅ Response will have gateway: 'mock'`);
  console.log(`    ✅ Should NOT show 'ai-direct-fallback' in metadata`);
} else {
  console.log(`    Use Real ComfyUI at ${COMFYUI_FETCH_HOST}`);
  console.log(`    If ComfyUI is down or returns 403:`);
  console.log(`      ❌ Response will have gateway: 'ai-direct-fallback'`);
  console.log(`      ❌ Will use SDXL fallback instead of ION pipeline`);
}

// Response Metadata Section
console.log('\n📊 Response Metadata to Check:');
console.log(`  Look for in the response metadata.pipeline.gateway:`);
if (COMFYUI_MOCK) {
  console.log(`    ✅ "mock" or "comfyui" → Full ION pipeline`);
  console.log(`    ❌ "ai-direct-fallback" → Error (shouldn't happen in mock mode)`);
} else {
  console.log(`    ✅ "comfyui" → Full ION pipeline used`);
  console.log(`    ❌ "ai-direct-fallback" → ComfyUI was unavailable`);
}

// Troubleshooting Section
console.log('\n🔧 Troubleshooting:');
if (COMFYUI_MOCK) {
  console.log(`  Mock mode is enabled. Expected behavior:`);
  console.log(`    - All image requests should use the full pipeline`);
  console.log(`    - Response should have gateway: 'mock'`);
  console.log(`    - If seeing 'ai-direct-fallback', check handler code`);
} else {
  console.log(`  Real ComfyUI mode. If seeing 'ai-direct-fallback':`);
  console.log(`    1. Check if ComfyUI is running: curl ${COMFYUI_FETCH_HOST}/queue`);
  console.log(`    2. Check if firewall is blocking: ${COMFYUI_FETCH_HOST}`);
  console.log(`    3. Check /prompt endpoint: curl -X POST ${COMFYUI_FETCH_HOST}/prompt`);
  console.log(`    4. Check logs for E_COMFYUI_DOWN or 403 errors`);
}

console.log('\n📝 Logs to Check:');
console.log(`  Enable debug logging in handler and search for:`);
console.log(`    - "ion_image_pipeline_start" → Request starting`);
console.log(`    - "ion_image_pipeline_success" → Full pipeline succeeded`);
console.log(`    - "ion_image_pipeline_error" → Pipeline failed`);
console.log(`    - "ion_image_pipeline_fallback_triggered" → Using SDXL fallback`);

console.log('\n' + '='.repeat(60));

// Run connectivity test if not in mock mode
testComfyUIConnectivity().catch(err => {
  console.error('Diagnostic test error:', err.message);
});
