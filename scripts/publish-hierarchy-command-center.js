#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const sourcePath = path.resolve(repoRoot, 'ionirix-hierarchy', 'docs', 'reports', 'command-center-data.json')
const targetPath = path.resolve(repoRoot, 'apps', 'dashboard', 'src', 'data', 'hierarchy-command-center.json')

function log(message) {
  process.stdout.write(`${message}\n`)
}

const sourceExists = fs.existsSync(sourcePath)
const targetExists = fs.existsSync(targetPath)

if (!sourceExists) {
  if (targetExists) {
    log(`[hierarchy publish] Source report missing at ${sourcePath}; keeping existing published dataset at ${targetPath}.`)
    process.exit(0)
  }

  process.stderr.write(`[hierarchy publish] Missing source report at ${sourcePath} and no published dataset exists at ${targetPath}.\n`)
  process.exit(1)
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true })
fs.copyFileSync(sourcePath, targetPath)

log(`[hierarchy publish] Published hierarchy dataset to ${targetPath}.`)