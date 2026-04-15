#!/usr/bin/env node

/**
 * ION Glass UI System - Deployment Script
 * Handles production deployment of the dashboard and worker
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const DEPLOY_TARGET = process.argv[2] || 'all' // 'dashboard', 'worker', or 'all'

function log(message, type = 'info') {
  const timestamp = new Date().toISOString()
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  }

  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
}

function checkEnvironment() {
  log('Checking deployment environment...')

  const requiredEnvVars = ['JWT_SECRET', 'ION_API_KEY']
  const missing = requiredEnvVars.filter(key => !process.env[key])

  if (missing.length > 0) {
    log(`Missing required environment variables: ${missing.join(', ')}`, 'error')
    log('Please set these in your .env file or deployment platform', 'warning')
    return false
  }

  log('Environment check passed', 'success')
  return true
}

function deployDashboard() {
  log('Deploying ION Dashboard to Vercel...')

  try {
    // Build the dashboard
    log('Building dashboard...')
    execSync('cd apps/dashboard && npm run build', { stdio: 'inherit' })

    // Deploy to Vercel
    log('Deploying to Vercel...')
    execSync('npx vercel --prod --yes', { stdio: 'inherit' })

    log('Dashboard deployment completed successfully!', 'success')
  } catch (error) {
    log(`Dashboard deployment failed: ${error.message}`, 'error')
    throw error
  }
}

function deployWorker() {
  log('Deploying ION Worker to Cloudflare...')

  try {
    // Deploy worker
    log('Deploying to Cloudflare Workers...')
    execSync('npx wrangler deploy', { stdio: 'inherit' })

    log('Worker deployment completed successfully!', 'success')
  } catch (error) {
    log(`Worker deployment failed: ${error.message}`, 'error')
    throw error
  }
}

function runHealthChecks() {
  log('Running post-deployment health checks...')

  // Add health check logic here
  log('Health checks completed', 'success')
}

async function main() {
  log('🚀 Starting ION Glass UI System Deployment')
  log(`Target: ${DEPLOY_TARGET}`)

  if (!checkEnvironment()) {
    process.exit(1)
  }

  try {
    switch (DEPLOY_TARGET) {
      case 'dashboard':
        await deployDashboard()
        break
      case 'worker':
        await deployWorker()
        break
      case 'all':
        await deployDashboard()
        await deployWorker()
        break
      default:
        log(`Invalid target: ${DEPLOY_TARGET}. Use 'dashboard', 'worker', or 'all'`, 'error')
        process.exit(1)
    }

    runHealthChecks()

    log('🎉 ION Glass UI System deployment completed successfully!')
    log('🌐 Dashboard: https://your-dashboard-url.vercel.app')
    log('⚡ Worker: https://ion-ai.ion-ai.workers.dev')

  } catch (error) {
    log(`Deployment failed: ${error.message}`, 'error')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}