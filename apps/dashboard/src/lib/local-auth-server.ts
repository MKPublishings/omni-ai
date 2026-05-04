import type { DashboardChatHistoryTurn, DashboardChatPreferences, DashboardOnboardingWorkspace, DashboardOnboardingWorkspaceInput } from './dashboard'
import type { AuthResponse, AuthUser } from './auth'

type StoredUser = AuthUser & {
  password: string
  createdAt: string
  updatedAt: string
}

type StoredSession = {
  id: string
  token: string
  userId: string
  expiresAt: string
  createdAt: string
}

type StoredVerification = {
  token: string
  userId: string
  expiresAt: string
  usedAt: string | null
}

type LocalAuthState = {
  users: StoredUser[]
  sessions: StoredSession[]
  verifications: StoredVerification[]
  workspaces: Record<string, DashboardOnboardingWorkspace>
  chatPreferences: Record<string, DashboardChatPreferences>
  chatHistory: Record<string, DashboardChatHistoryTurn[]>
}

type JsonResult<T> = {
  status: number
  body: T
}

type SignupBody = {
  email?: string
  password?: string
  displayName?: string
  username?: string
  onboarding?: DashboardOnboardingWorkspaceInput
}

type LoginBody = {
  identifier?: string
  email?: string
  username?: string
  password?: string
}

type ProfileBody = {
  displayName?: string
  username?: string
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7
const VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/

declare global {
  var __ION_DASHBOARD_LOCAL_AUTH_STATE__: LocalAuthState | undefined
}

function nowIso(): string {
  return new Date().toISOString()
}

function seedState(): LocalAuthState {
  const userId = 'local-admin-user'
  return {
    users: [
      {
        id: userId,
        username: 'mirnes',
        email: 'mirnes@ionirix.com',
        displayName: 'Mirnes',
        role: 'admin',
        emailVerified: true,
        password: 'sovereign2026',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
    sessions: [],
    verifications: [],
    workspaces: {
      [userId]: {
        id: 'workspace-local-admin',
        userId,
        workspaceId: 'ion-local-admin',
        workspaceName: 'ION Admin Workspace',
        workspaceSlug: 'ion-admin-workspace',
        primaryRoute: '/assistant',
        capabilityScore: 6,
        provisioningStatus: 'active',
        source: 'local-seed',
        shell: {},
        modules: [],
        orchestration: {},
        summary: ['Local admin workspace ready.'],
        context: {
          workspace: {
            name: 'ION Admin Workspace',
            slug: 'ion-admin-workspace',
          },
          preferences: {},
        },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    },
    chatPreferences: {},
    chatHistory: {},
  }
}

function getState(): LocalAuthState {
  if (!globalThis.__ION_DASHBOARD_LOCAL_AUTH_STATE__) {
    globalThis.__ION_DASHBOARD_LOCAL_AUTH_STATE__ = seedState()
  }

  if (!globalThis.__ION_DASHBOARD_LOCAL_AUTH_STATE__.chatPreferences) {
    globalThis.__ION_DASHBOARD_LOCAL_AUTH_STATE__.chatPreferences = {}
  }

  if (!globalThis.__ION_DASHBOARD_LOCAL_AUTH_STATE__.chatHistory) {
    globalThis.__ION_DASHBOARD_LOCAL_AUTH_STATE__.chatHistory = {}
  }

  return globalThis.__ION_DASHBOARD_LOCAL_AUTH_STATE__
}

function jsonResult<T>(body: T, status = 200): JsonResult<T> {
  return { status, body }
}

function trimLower(value: string | undefined): string {
  return String(value || '').trim().toLowerCase()
}

function trimValue(value: string | undefined): string {
  return String(value || '').trim()
}

function validateEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email)
}

function validateUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username)
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number.'
  }

  return null
}

function toAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerified: user.emailVerified,
  }
}

function stripExpiredRecords(state: LocalAuthState): void {
  const currentTime = Date.now()
  state.sessions = state.sessions.filter((session) => new Date(session.expiresAt).getTime() > currentTime)
  state.verifications = state.verifications.filter((verification) => new Date(verification.expiresAt).getTime() > currentTime || verification.usedAt !== null)
}

function findUserByEmail(state: LocalAuthState, email: string): StoredUser | undefined {
  const normalizedEmail = trimLower(email)
  return state.users.find((user) => user.email === normalizedEmail)
}

function findUserByUsername(state: LocalAuthState, username: string): StoredUser | undefined {
  const normalizedUsername = trimLower(username)
  return state.users.find((user) => user.username === normalizedUsername)
}

function findUserByIdentifier(state: LocalAuthState, identifier: string): StoredUser | undefined {
  const normalizedIdentifier = trimLower(identifier)
  return state.users.find((user) => user.email === normalizedIdentifier || user.username === normalizedIdentifier)
}

function buildVerificationUrl(request: Request, token: string, email: string): string {
  const url = new URL('/verify-email', request.url)
  url.searchParams.set('token', token)
  url.searchParams.set('email', email)
  return url.toString()
}

function issueVerification(state: LocalAuthState, request: Request, user: StoredUser) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString()

  state.verifications = state.verifications.filter((verification) => verification.userId !== user.id || verification.usedAt !== null)
  state.verifications.push({
    token,
    userId: user.id,
    expiresAt,
    usedAt: null,
  })

  return {
    token,
    expiresAt,
    verificationUrl: buildVerificationUrl(request, token, user.email),
  }
}

function createSession(state: LocalAuthState, user: StoredUser): AuthResponse {
  const currentTime = nowIso()
  const session: StoredSession = {
    id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    createdAt: currentTime,
  }

  state.sessions = state.sessions.filter((entry) => entry.userId !== user.id)
  state.sessions.push(session)

  return {
    token: session.token,
    sessionId: session.id,
    expiresAt: session.expiresAt,
    accessTier: user.role,
    user: toAuthUser(user),
  }
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }

  const cookieHeader = request.headers.get('cookie') || request.headers.get('Cookie')
  if (!cookieHeader) {
    return null
  }

  const match = cookieHeader.match(/(?:^|;\s*)ion_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function getSessionAuth(state: LocalAuthState, request: Request): { session: StoredSession; user: StoredUser } | null {
  stripExpiredRecords(state)
  const token = getBearerToken(request)
  if (!token) {
    return null
  }

  const session = state.sessions.find((entry) => entry.token === token)
  if (!session) {
    return null
  }

  const user = state.users.find((entry) => entry.id === session.userId)
  if (!user) {
    return null
  }

  return { session, user }
}

function buildWorkspaceRecord(userId: string, onboarding: DashboardOnboardingWorkspaceInput): DashboardOnboardingWorkspace {
  const formation = onboarding.formation
  const currentTime = nowIso()

  return {
    id: `workspace-${crypto.randomUUID()}`,
    userId,
    workspaceId: formation.workspaceId,
    workspaceName: formation.workspaceName,
    workspaceSlug: formation.workspaceSlug,
    primaryRoute: formation.primaryRoute,
    capabilityScore: formation.capabilityScore,
    provisioningStatus: 'pending-verification',
    source: 'signup-onboarding',
    shell: formation.shell,
    modules: formation.modules,
    orchestration: formation.orchestration,
    summary: formation.summary,
    context: onboarding.context,
    createdAt: currentTime,
    updatedAt: currentTime,
  }
}

export async function signupLocalUser(request: Request, body: SignupBody): Promise<JsonResult<unknown>> {
  const state = getState()
  const email = trimLower(body.email)
  const displayName = trimValue(body.displayName)
  const username = trimLower(body.username)
  const password = String(body.password || '')

  if (displayName.length < 2) {
    return jsonResult({ error: 'Display name must be at least 2 characters.' }, 400)
  }

  if (!validateEmail(email)) {
    return jsonResult({ error: 'A valid email address is required.' }, 400)
  }

  if (!validateUsername(username)) {
    return jsonResult({ error: 'Username must be 3-32 characters and use letters, numbers, dots, dashes, or underscores.' }, 400)
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    return jsonResult({ error: passwordError }, 400)
  }

  if (findUserByEmail(state, email)) {
    return jsonResult({ error: 'An account with that email already exists.' }, 409)
  }

  if (findUserByUsername(state, username)) {
    return jsonResult({ error: 'That username is already in use.' }, 409)
  }

  const user: StoredUser = {
    id: crypto.randomUUID(),
    username,
    email,
    displayName,
    role: 'operator',
    emailVerified: false,
    password,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  state.users.push(user)

  let workspaceProvisioned = false
  if (body.onboarding) {
    state.workspaces[user.id] = buildWorkspaceRecord(user.id, body.onboarding)
    workspaceProvisioned = true
  }

  const verification = issueVerification(state, request, user)

  return jsonResult({
    verificationRequired: true,
    verificationUrl: verification.verificationUrl,
    verificationDelivery: 'manual-link',
    verificationProvider: 'local-dev',
    verificationEmailSent: false,
    verificationEmailError: 'Local dashboard auth exposes a direct verification link instead of sending email.',
    workspaceProvisioned,
    user: toAuthUser(user),
  }, 201)
}

export async function loginLocalUser(request: Request, body: LoginBody): Promise<JsonResult<unknown>> {
  const state = getState()
  const identifier = trimLower(body.identifier || body.email || body.username)
  const password = String(body.password || '')

  if (!identifier || !password) {
    return jsonResult({ error: 'Username or email and password are required.' }, 400)
  }

  const user = findUserByIdentifier(state, identifier)
  if (!user || user.password !== password) {
    return jsonResult({ error: 'Invalid username/email or password.' }, 401)
  }

  if (!user.emailVerified) {
    const verification = issueVerification(state, request, user)
    return jsonResult({
      error: 'Email verification is required before signing in.',
      code: 'EMAIL_VERIFICATION_REQUIRED',
      verificationUrl: verification.verificationUrl,
      verificationDelivery: 'manual-link',
      verificationProvider: 'local-dev',
      verificationEmailSent: false,
      verificationEmailError: 'Local dashboard auth exposes a direct verification link instead of sending email.',
    }, 403)
  }

  return jsonResult(createSession(state, user))
}

export async function getLocalSession(request: Request): Promise<JsonResult<unknown>> {
  const state = getState()
  const auth = getSessionAuth(state, request)
  if (!auth) {
    return jsonResult({ error: 'Invalid or expired session.' }, 401)
  }

  return jsonResult({
    user: toAuthUser(auth.user),
    sessionId: auth.session.id,
    expiresAt: auth.session.expiresAt,
    accessTier: auth.user.role,
  })
}

export async function verifyLocalEmail(request: Request, token: string): Promise<JsonResult<unknown>> {
  const state = getState()
  stripExpiredRecords(state)
  const normalizedToken = trimValue(token)

  if (!normalizedToken) {
    return jsonResult({ error: 'Verification token is required.', code: 'EMAIL_VERIFICATION_MISSING_TOKEN' }, 400)
  }

  const verification = state.verifications.find((entry) => entry.token === normalizedToken)
  if (!verification) {
    return jsonResult({ error: 'This verification link is invalid.', code: 'EMAIL_VERIFICATION_INVALID' }, 400)
  }

  if (verification.usedAt) {
    return jsonResult({ error: 'This verification link has already been used. Sign in to continue.', code: 'EMAIL_VERIFICATION_USED' }, 409)
  }

  if (new Date(verification.expiresAt).getTime() <= Date.now()) {
    return jsonResult({ error: 'This verification link has expired. Request a fresh verification email to continue.', code: 'EMAIL_VERIFICATION_EXPIRED' }, 410)
  }

  const user = state.users.find((entry) => entry.id === verification.userId)
  if (!user) {
    return jsonResult({ error: 'This verification link is invalid.', code: 'EMAIL_VERIFICATION_INVALID' }, 400)
  }

  verification.usedAt = nowIso()
  user.emailVerified = true
  user.updatedAt = nowIso()

  const workspace = state.workspaces[user.id]
  if (workspace) {
    workspace.provisioningStatus = 'active'
    workspace.updatedAt = nowIso()
  }

  return jsonResult({
    ok: true,
    verified: true,
    code: 'EMAIL_VERIFICATION_VERIFIED',
    ...createSession(state, user),
  })
}

export async function resendLocalVerification(request: Request, identifier: string): Promise<JsonResult<unknown>> {
  const state = getState()
  const user = findUserByIdentifier(state, identifier)

  if (!user) {
    return jsonResult({ error: 'No account was found for that identifier.' }, 404)
  }

  if (user.emailVerified) {
    return jsonResult({ ok: true, alreadyVerified: true })
  }

  const verification = issueVerification(state, request, user)
  return jsonResult({
    ok: true,
    verificationRequired: true,
    verificationUrl: verification.verificationUrl,
    verificationDelivery: 'manual-link',
    verificationProvider: 'local-dev',
    verificationEmailSent: false,
    verificationEmailError: 'Local dashboard auth exposes a direct verification link instead of sending email.',
  })
}

export async function updateLocalProfile(request: Request, body: ProfileBody): Promise<JsonResult<unknown>> {
  const state = getState()
  const auth = getSessionAuth(state, request)
  if (!auth) {
    return jsonResult({ error: 'No auth token provided.' }, 401)
  }

  const displayName = body.displayName === undefined ? auth.user.displayName : trimValue(body.displayName)
  const username = body.username === undefined ? auth.user.username : trimLower(body.username)

  if (displayName.length < 2) {
    return jsonResult({ error: 'Display name must be at least 2 characters.' }, 400)
  }

  if (!validateUsername(username)) {
    return jsonResult({ error: 'Username must be 3-32 characters and use letters, numbers, dots, dashes, or underscores.' }, 400)
  }

  const usernameOwner = findUserByUsername(state, username)
  if (usernameOwner && usernameOwner.id !== auth.user.id) {
    return jsonResult({ error: 'That username is already in use.', code: 'USERNAME_CONFLICT' }, 409)
  }

  auth.user.displayName = displayName
  auth.user.username = username
  auth.user.updatedAt = nowIso()

  return jsonResult({ user: toAuthUser(auth.user) })
}

export async function getLocalWorkspace(request: Request): Promise<JsonResult<unknown>> {
  const state = getState()
  const auth = getSessionAuth(state, request)
  if (!auth) {
    return jsonResult({ error: 'Invalid or expired session.' }, 401)
  }

  return jsonResult({ workspace: state.workspaces[auth.user.id] || null })
}

export async function provisionLocalWorkspace(request: Request, input: DashboardOnboardingWorkspaceInput): Promise<JsonResult<unknown>> {
  const state = getState()
  const auth = getSessionAuth(state, request)
  if (!auth) {
    return jsonResult({ error: 'Invalid or expired session.' }, 401)
  }

  const workspace = buildWorkspaceRecord(auth.user.id, input)
  workspace.provisioningStatus = auth.user.emailVerified ? 'active' : 'pending-verification'
  state.workspaces[auth.user.id] = workspace

  return jsonResult({ workspace }, 201)
}

function getDefaultChatPreferences(): DashboardChatPreferences {
  return {
    persistHistory: true,
    contextCarryover: true,
    updatedAt: nowIso(),
  }
}

function resolveUserChatPreferences(state: LocalAuthState, userId: string): DashboardChatPreferences {
  const existing = state.chatPreferences[userId]
  if (existing) {
    return existing
  }

  const next = getDefaultChatPreferences()
  state.chatPreferences[userId] = next
  return next
}

function deriveAccessTier(user: StoredUser): string {
  if (user.role === 'admin') {
    return 'enterprise'
  }

  if (user.role === 'premium' || user.role === 'enterprise') {
    return user.role
  }

  return 'free'
}

export async function getLocalEntitlements(request: Request): Promise<JsonResult<unknown>> {
  const state = getState()
  const auth = getSessionAuth(state, request)
  if (!auth) {
    return jsonResult({ error: 'Invalid or expired session.' }, 401)
  }

  const accessTier = deriveAccessTier(auth.user)
  const activeEntitlement = accessTier === 'free'
    ? null
    : {
        id: `entitlement-${auth.user.id}`,
        tier: accessTier,
        status: 'active',
        source: 'local-dev',
        updated_at: nowIso(),
      }

  return jsonResult({
    accessTier,
    activeEntitlement,
    entitlements: activeEntitlement ? [activeEntitlement] : [],
  })
}

export async function getLocalBillingStatus(request: Request): Promise<JsonResult<unknown>> {
  const state = getState()
  const auth = getSessionAuth(state, request)
  if (!auth) {
    return jsonResult({ error: 'Invalid or expired session.' }, 401)
  }

  return jsonResult({
    customer: {
      id: `customer-${auth.user.id}`,
      provider: 'local-dev',
      provider_customer_id: `local-${auth.user.id}`,
      email: auth.user.email,
      status: auth.user.emailVerified ? 'verified' : 'pending-verification',
      updated_at: nowIso(),
    },
    subscriptions: [],
    providerConfigured: false,
    priceConfiguration: {
      premiumMonthly: false,
      premiumYearly: false,
      enterpriseMonthly: false,
      enterpriseYearly: false,
    },
    priceIds: {
      premiumMonthly: null,
      premiumYearly: null,
      enterpriseMonthly: null,
      enterpriseYearly: null,
    },
  })
}

export async function getLocalChatHistory(request: Request, limit = 120): Promise<JsonResult<unknown>> {
  const state = getState()
  const auth = getSessionAuth(state, request)
  if (!auth) {
    return jsonResult({ error: 'Invalid or expired session.' }, 401)
  }

  const turns = Array.isArray(state.chatHistory[auth.user.id])
    ? state.chatHistory[auth.user.id].slice(-Math.max(1, limit))
    : []

  return jsonResult({
    turns,
    preferences: resolveUserChatPreferences(state, auth.user.id),
  })
}

export async function clearLocalChatHistory(request: Request): Promise<JsonResult<unknown>> {
  const state = getState()
  const auth = getSessionAuth(state, request)
  if (!auth) {
    return jsonResult({ error: 'Invalid or expired session.' }, 401)
  }

  const deletedCount = Array.isArray(state.chatHistory[auth.user.id]) ? state.chatHistory[auth.user.id].length : 0
  state.chatHistory[auth.user.id] = []

  return jsonResult({ ok: true, deletedCount })
}

export async function getLocalChatSettings(request: Request): Promise<JsonResult<unknown>> {
  const state = getState()
  const auth = getSessionAuth(state, request)
  if (!auth) {
    return jsonResult({ error: 'Invalid or expired session.' }, 401)
  }

  return jsonResult({ preferences: resolveUserChatPreferences(state, auth.user.id) })
}

export async function updateLocalChatSettings(request: Request, body: Partial<Pick<DashboardChatPreferences, 'persistHistory' | 'contextCarryover'>>): Promise<JsonResult<unknown>> {
  const state = getState()
  const auth = getSessionAuth(state, request)
  if (!auth) {
    return jsonResult({ error: 'Invalid or expired session.' }, 401)
  }

  const current = resolveUserChatPreferences(state, auth.user.id)
  const next: DashboardChatPreferences = {
    persistHistory: body.persistHistory ?? current.persistHistory,
    contextCarryover: body.contextCarryover ?? current.contextCarryover,
    updatedAt: nowIso(),
  }
  state.chatPreferences[auth.user.id] = next

  return jsonResult({ preferences: next })
}