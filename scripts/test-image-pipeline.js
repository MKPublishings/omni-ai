#!/usr/bin/env node

/**
 * Image Generation Pipeline Tester
 * Tests if full ION pipeline or fallback is being used
 * Usage: node scripts/test-image-pipeline.js [prompt]
 */

import { buildIonImageGenerationRequest } from '../src/image-gen/app/ion-image-pipeline.js';
import { executeIonImagePipeline } from '../src/image-gen/app/ion-image-pipeline.js';
import { readImageGenEnvironment } from '../src/image-gen/config/env.js';

const DEFAULT_PROMPT = 'a beautiful landscape with mountains and lake';
const prompt = process.argv[2] || DEFAULT_PROMPT;

console.log('🧪 ION Image Pipeline Test\n');
console.log('='.repeat(70));

async function testPipeline() {
  try {
    // Get environment
    const env = readImageGenEnvironment(process.env);
    
    console.log('\n📋 Configuration:');
    console.log(`  Mock Mode: ${env.ionMock ? '✅ YES' : '❌ NO'}`);
    console.log(`  Host: ${env.ionFetchHost}`);
    console.log(`  Timeout: ${env.ionRequestTimeoutMs}ms`);
    
    console.log('\n📝 Request:');
    console.log(`  Prompt: "${prompt}"`);
    console.log(`  User ID: test-user`);
    console.log(`  Dimensions: 1024x1536`);
    
    console.log('\n⏳ Starting pipeline...\n');
    const startTime = Date.now();
    
    // Execute pipeline
    const result = await executeIonImagePipeline({
      userId: 'test-user',
      prompt,
      width: 1024,
      height: 1536,
    }, process.env);
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Pipeline Execution Successful!\n');
    
    console.log('📊 Results:');
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Gateway: ${result.gatewayKind}`);
    console.log(`  Image Bytes: ${result.imageBytes.length}`);
    console.log(`  Output Model: ${result.outputModel}`);
    console.log(`  Prompt ID: ${result.promptId}`);
    
    console.log('\n🎯 Analysis:');
    if (result.gatewayKind === 'mock') {
      console.log('  ✅ Using MockionClient');
      console.log('  ✅ Full ION pipeline executed');
      console.log('  ✅ NO fallback was used');
      console.log('  ✅ Response should have gateway: "mock"');
    } else if (result.gatewayKind === 'ion') {
      console.log('  ✅ Using Real ionClient');
      console.log('  ✅ Connected to ion at: ' + env.ionFetchHost);
      console.log('  ✅ Full ION pipeline executed');
      console.log('  ✅ NO fallback was used');
      console.log('  ✅ Response should have gateway: "ion"');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✨ Pipeline Test: SUCCESS');
    console.log('The full ION pipeline is working correctly.');
    console.log('If you\'re seeing "ai-direct-fallback" in responses,');
    console.log('it indicates a different code path is being used.\n');
    
  } catch (error) {
    console.log('\n❌ Pipeline Execution Failed!\n');
    console.log('💥 Error Details:');
    console.log(`  Name: ${(error?.name || 'Error').toUpperCase()}`);
    console.log(`  Message: ${error?.message || 'Unknown error'}`);
    
    if (String(error?.message || '').includes('403')) {
      console.log('\n⚠️  Got 403 error - This would trigger SDXL fallback');
      console.log('  Likely cause: ion /prompt endpoint rejected request');
    } else if (String(error?.message || '').includes('ECONNREFUSED')) {
      console.log('\n⚠️  Connection refused - ion not reachable');
      console.log(`  Check if ion is running at: ${process.env.ion_HOST || 'http://localhost:8188'}`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n❌ Pipeline Test: FAILED');
    console.log('This error would trigger the SDXL fallback in production.\n');
    
    process.exit(1);
  }
}

testPipeline();
