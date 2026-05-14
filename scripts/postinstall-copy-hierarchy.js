
// This script copies the built ionirix-eight-point-hierarchy package to node_modules for CI/CD environments that do not support workspace linking.
const fs = require('fs');
const path = require('path');
const repoRoot = path.resolve(__dirname, '..');


// Symlink src/image-gen into apps/dashboard/node_modules for Next.js resolution
const imageGenSrc = path.resolve(repoRoot, 'src', 'image-gen');
const imageGenDest = path.resolve(repoRoot, 'apps', 'dashboard', 'node_modules', 'image-gen');
try {
  if (fs.existsSync(imageGenDest)) {
    fs.rmSync(imageGenDest, { recursive: true, force: true });
  }
  fs.symlinkSync(imageGenSrc, imageGenDest, 'junction');
  console.log('Symlinked src/image-gen into apps/dashboard/node_modules/image-gen');
} catch (err) {
  console.warn('Symlink of src/image-gen failed:', err.message);
}

// Copy the entire built ionirix-eight-point-hierarchy package into apps/dashboard/node_modules for Next.js resolution
const hierarchySrc = path.resolve(repoRoot, 'packages', 'ionirix-hierarchy');
const hierarchyDestDashboard = path.resolve(repoRoot, 'apps', 'dashboard', 'node_modules', 'ionirix-eight-point-hierarchy');
function copyEntireDir(srcDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue; // skip nested node_modules
      copyEntireDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
copyEntireDir(hierarchySrc, hierarchyDestDashboard);
console.log('Copied entire ionirix-eight-point-hierarchy package to apps/dashboard/node_modules for Next.js resolution.');
const src = path.resolve(repoRoot, 'packages', 'ionirix-hierarchy', 'dist');
const destRoot = path.resolve(repoRoot, 'node_modules', 'ionirix-eight-point-hierarchy');
const destDashboard = path.resolve(repoRoot, 'apps', 'dashboard', 'node_modules', 'ionirix-eight-point-hierarchy');

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy package.json and README if present
const pkgSrc = path.resolve(repoRoot, 'packages', 'ionirix-hierarchy', 'package.json');

function copyPackage(dest) {
  const pkgDest = path.join(dest, 'package.json');
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(pkgSrc, pkgDest);
  const readmeSrc = path.resolve(repoRoot, 'packages', 'ionirix-hierarchy', 'README.md');
  if (fs.existsSync(readmeSrc)) fs.copyFileSync(readmeSrc, path.join(dest, 'README.md'));
  // Copy dist contents
  copyDir(src, path.join(dest, 'dist'));
}

copyPackage(destRoot);
copyPackage(destDashboard);

console.log('ionirix-eight-point-hierarchy copied to node_modules and apps/dashboard/node_modules for CI/CD.');
