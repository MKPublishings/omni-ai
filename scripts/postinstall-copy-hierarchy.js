// This script copies the built ionirix-eight-point-hierarchy package to node_modules for CI/CD environments that do not support workspace linking.
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const src = path.resolve(repoRoot, 'packages', 'ionirix-hierarchy', 'dist');
const dest = path.resolve(repoRoot, 'node_modules', 'ionirix-eight-point-hierarchy');

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
const pkgDest = path.join(dest, 'package.json');
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
fs.copyFileSync(pkgSrc, pkgDest);
const readmeSrc = path.resolve(repoRoot, 'packages', 'ionirix-hierarchy', 'README.md');
if (fs.existsSync(readmeSrc)) fs.copyFileSync(readmeSrc, path.join(dest, 'README.md'));

// Copy dist contents
copyDir(src, path.join(dest, 'dist'));

console.log('ionirix-eight-point-hierarchy copied to node_modules for CI/CD.');
