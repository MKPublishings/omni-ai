import { expect, test } from '@playwright/test'

const formationKey = 'ionirix:onboarding:formation'

function workspaceRecord(primaryRoute: string) {
  return {
    workspace: {
      id: 'ow-1',
      userId: 'user-1',
      workspaceId: 'ix-e2e1234',
      workspaceName: 'E2E Workspace',
      workspaceSlug: 'e2e-workspace',
      primaryRoute,
      capabilityScore: 6,
      provisioningStatus: 'active',
      source: 'onboarding',
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    },
  }
}

async function fillOnboarding(page: import('@playwright/test').Page, identity: {
  displayName: string
  username: string
  email: string
  password: string
  workspaceName: string
  workspaceSlug: string
  intent: string
}) {
  await page.getByPlaceholder('Display name', { exact: true }).fill(identity.displayName)
  await page.getByPlaceholder('Username', { exact: true }).fill(identity.username)
  await page.getByPlaceholder('Email address', { exact: true }).fill(identity.email)
  await page.getByPlaceholder('Password', { exact: true }).fill(identity.password)
  await page.getByPlaceholder('Confirm password', { exact: true }).fill(identity.password)
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByPlaceholder('Workspace name', { exact: true }).fill(identity.workspaceName)
  await page.getByPlaceholder('workspace-slug', { exact: true }).fill(identity.workspaceSlug)
  await page.getByRole('button', { name: 'founder' }).click()
  await page.getByLabel('Enable team-oriented workspace posture').check()
  await page.getByPlaceholder('Describe what this workspace will govern, coordinate, or produce.', { exact: true }).fill(identity.intent)
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('button', { name: 'light' }).click()
  await page.getByRole('button', { name: 'spacious' }).click()
  await page.getByRole('button', { name: 'reduced' }).click()
  await page.getByRole('button', { name: 'focus' }).click()
  await page.getByRole('button', { name: 'right' }).click()
  await page.getByLabel('Enable full onboarding telemetry capture').check()
  await page.getByRole('button', { name: 'Continue' }).click()
}

test('completes signup, verifies, and routes into the persisted workspace entry', async ({ page }) => {
  let capturedSignupBody: Record<string, unknown> | null = null

  await page.route('**/api/auth/signup', async (route) => {
    capturedSignupBody = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verificationRequired: true,
        verificationUrl: '/verify-email?token=e2e-token&email=operator%40ionirix.test',
        verificationEmailSent: true,
        workspaceProvisioned: true,
      }),
    })
  })

  await page.route('**/api/auth/verify-email', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ token: 'e2e-token' })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        verified: true,
      }),
    })
  })

  await page.route('**/api/onboarding/workspace**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(workspaceRecord('/assistant')),
    })
  })

  await page.goto('/onboarding')

  await fillOnboarding(page, {
    displayName: 'E2E Operator',
    username: 'e2eoperator',
    email: 'operator@ionirix.test',
    password: 'Passw0rd!',
    workspaceName: 'E2E Workspace',
    workspaceSlug: 'e2e-workspace',
    intent: 'Coordinate assistant-led operating flows.',
  })

  await expect(page.getByText('Review the formation output.')).toBeVisible()
  await page.getByRole('button', { name: 'Create account' }).click()

  await page.waitForURL('**/verify-email?email=operator%40ionirix.test')

  expect(capturedSignupBody).not.toBeNull()
  expect(capturedSignupBody).toMatchObject({
    email: 'operator@ionirix.test',
    username: 'e2eoperator',
    onboarding: {
      context: {
        workspace: {
          name: 'E2E Workspace',
          slug: 'e2e-workspace',
        },
      },
    },
  })

  await page.goto('/verify-email?token=e2e-token&email=operator%40ionirix.test')
  await page.waitForURL('**/assistant')

  await expect(page).toHaveURL(/\/assistant$/)
  await expect.poll(async () => page.evaluate((key) => window.localStorage.getItem(key), formationKey)).toBeNull()
})

test('falls back to the local formation route when login cannot load a server workspace record', async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, JSON.stringify({ primaryRoute: '/tools' }))
  }, formationKey)

  await page.route('**/api/auth/login', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      identifier: 'operator@ionirix.test',
      password: 'Passw0rd!',
    })

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'login-token',
        sessionId: 'session-1',
        expiresAt: '2026-04-22T00:00:00.000Z',
        accessTier: 'operator',
        user: {
          id: 'user-1',
          username: 'e2eoperator',
          email: 'operator@ionirix.test',
          displayName: 'E2E Operator',
          role: 'operator',
          emailVerified: true,
        },
      }),
    })
  })

  await page.route('**/api/onboarding/workspace**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'workspace lookup unavailable' }),
    })
  })

  await page.goto('/login')
  await page.getByPlaceholder('Email or username').fill('operator@ionirix.test')
  await page.getByPlaceholder('Password').fill('Passw0rd!')
  await page.getByRole('button', { name: 'Access ION AI' }).click()

  await page.waitForURL('**/tools')
  await expect(page).toHaveURL(/\/tools$/)
  await expect.poll(async () => page.evaluate((key) => window.localStorage.getItem(key), formationKey)).toContain('/tools')
})

test('falls back to the local formation route when verification cannot load a server workspace record', async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, JSON.stringify({ primaryRoute: '/memory' }))
  }, formationKey)

  await page.route('**/api/auth/verify-email', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ token: 'fallback-token' })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        verified: true,
      }),
    })
  })

  await page.route('**/api/onboarding/workspace**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'not authenticated' }),
    })
  })

  await page.goto('/verify-email?token=fallback-token&email=operator%40ionirix.test')

  await page.waitForURL('**/memory')
  await expect(page).toHaveURL(/\/memory$/)
  await expect.poll(async () => page.evaluate((key) => window.localStorage.getItem(key), formationKey)).toContain('/memory')
})