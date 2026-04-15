#!/usr/bin/env node

/**
 * Build Orchestration Script
 * 
 * Builds the entire ION AI platform:
 * 1. Builds dashboard (Next.js) → outputs to apps/dashboard/out
 * 2. Copies dashboard output to /public
 * 3. Validates ION Image Engine
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DASHBOARD_DIR = path.join(__dirname, '../apps/dashboard');
const DASHBOARD_OUT = path.join(DASHBOARD_DIR, 'out');
const PUBLIC_DIR = path.join(__dirname, '../public');
const VALIDATOR_SCRIPT = path.join(__dirname, '../ION-image-engine/utils/validator.js');
const TOKENS_DIR = path.join(__dirname, '../packages/tokens');
const GLASS_DIR = path.join(__dirname, '../packages/glass');

console.log('🚀 ION Build System Starting...\n');

// Step 0: Build shared UI packages
console.log('🧱 Step 0: Building shared UI packages...');
try {
  execSync('npm run build', { cwd: TOKENS_DIR, stdio: 'inherit' });
  execSync('npm run build', { cwd: GLASS_DIR, stdio: 'inherit' });
  console.log('✅ Shared UI packages built successfully\n');
} catch (error) {
  console.error('❌ Shared UI package build failed');
  process.exit(1);
}

// Step 1: Build Dashboard
console.log('📦 Step 1: Building Dashboard (Next.js)...');
try {
  execSync('npm run build', { cwd: DASHBOARD_DIR, stdio: 'inherit' });
  console.log('✅ Dashboard built successfully\n');
} catch (error) {
  console.error('❌ Dashboard build failed');
  process.exit(1);
}

// Step 2: Copy dashboard output to /public
console.log('📋 Step 2: Deploying dashboard to /public...');
try {
  // Clear public directory (except .gitkeep files)
  if (fs.existsSync(PUBLIC_DIR)) {
    const files = fs.readdirSync(PUBLIC_DIR);
    files.forEach(file => {
      if (file !== '.gitkeep') {
        const filePath = path.join(PUBLIC_DIR, file);
        if (fs.lstatSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    });
  }

  // Copy from dashboard/out to public
  if (!fs.existsSync(DASHBOARD_OUT)) {
    throw new Error(`Dashboard output not found at ${DASHBOARD_OUT}`);
  }

  copyDirRecursive(DASHBOARD_OUT, PUBLIC_DIR);
  console.log('✅ Dashboard deployed to /public\n');
} catch (error) {
  console.error('❌ Deployment to /public failed:', error.message);
  process.exit(1);
}

// Step 3: Validate ION Image Engine
console.log('🔍 Step 3: Validating ION Image Engine...');
try {
  execSync(`node ${VALIDATOR_SCRIPT}`, { stdio: 'inherit' });
  console.log('\n✅ Image Engine validation passed\n');
} catch (error) {
  console.error('❌ Image Engine validation failed');
  process.exit(1);
}

console.log('🎉 Build completed successfully!');
console.log('✨ Your site is ready for deployment with: npx wrangler deploy\n');

/**
 * Recursively copy directory contents
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}
