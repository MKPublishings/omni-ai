'use client'

import type { AuthResponse, AuthUser } from './auth'

export type SocialProvider = 'google' | 'x'

export interface SocialProviderLink {
  id: SocialProvider
  label: string
  enabled: boolean
  href: string | null
}

function buildDefaultProviderUrl(provider: SocialProvider): string {
  const apiBaseUrl = String(process.env.NEXT_PUBLIC_ION_API_URL || '').trim().replace(/\/+$/, '')
  if (!apiBaseUrl) {
    return ''
  }

  if (provider === 'google') {
    return `${apiBaseUrl}/api/auth/google/start`
  }

  return ''
}

export interface SocialAuthCallbackResolution {
  status: 'success' | 'error' | 'incomplete'
  provider: SocialProvider | null
  nextPath: string
  payload?: AuthResponse
  error?: string
}

const SOCIAL_AUTH_CALLBACK_PATH = '/auth/callback'

function decodeUrlComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function decodeBase64Url(value: string): string | null {
  if (typeof window === 'undefined' || typeof window.atob !== 'function') {
    return null
  }

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')

  try {
    const binary = window.atob(padded)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function parseStructuredValue<T>(rawValue: string | null): T | null {
  if (!rawValue) {
    return null
  }

  const candidates = new Set<string>([rawValue, decodeUrlComponent(rawValue)])
  const decoded = decodeBase64Url(rawValue)
  if (decoded) {
    candidates.add(decoded)
  }

  const decodedComponent = decodeUrlComponent(rawValue)
  const decodedComponentBase64 = decodeBase64Url(decodedComponent)
  if (decodedComponentBase64) {
    candidates.add(decodedComponentBase64)
  }

  for (const candidate of Array.from(candidates)) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      continue
    }
  }

  return null
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

function coerceUser(input: unknown): AuthUser | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const candidate = input as Record<string, unknown>
  const id = String(candidate.id || '').trim()
  const username = String(candidate.username || '').trim()
  const email = String(candidate.email || '').trim()
  const displayName = String(candidate.displayName || '').trim()
  const role = String(candidate.role || 'user').trim() || 'user'

  if (!id || !username || !email || !displayName) {
    return null
  }

  return {
    id,
    username,
    email,
    displayName,
    role,
    emailVerified: normalizeBoolean(candidate.emailVerified),
  }
}

function coerceAuthResponse(input: unknown): AuthResponse | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const candidate = input as Record<string, unknown>
  const user = coerceUser(candidate.user)
  const token = String(candidate.token || '').trim()
  const sessionId = String(candidate.sessionId || candidate.session_id || '').trim()
  const expiresAt = String(candidate.expiresAt || candidate.expires_at || '').trim()
  const accessTier = String(candidate.accessTier || candidate.access_tier || '').trim()

  if (!token || !sessionId || !expiresAt || !user) {
    return null
  }

  return {
    token,
    sessionId,
    expiresAt,
    user,
    ...(accessTier ? { accessTier } : {}),
  }
}

function getParamValue(searchParams: URLSearchParams, names: string[]): string | null {
  for (const name of names) {
    const value = searchParams.get(name)
    if (value) {
      return value
    }
  }

  return null
}

function normalizeProvider(value: string | null): SocialProvider | null {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'google') {
    return 'google'
  }

  if (normalized === 'x' || normalized === 'twitter') {
    return 'x'
  }

  return null
}

function buildCallbackUrl(provider: SocialProvider, nextPath: string): string {
  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const callbackUrl = new URL(SOCIAL_AUTH_CALLBACK_PATH, baseOrigin)
  callbackUrl.searchParams.set('provider', provider)
  if (nextPath) {
    callbackUrl.searchParams.set('next', nextPath)
  }

  if (callbackUrl.origin === 'http://localhost') {
    return `${callbackUrl.pathname}${callbackUrl.search}`
  }

  return callbackUrl.toString()
}

function appendProviderParams(rawUrl: string, provider: SocialProvider, nextPath: string): string {
  try {
    const resolved = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    if (nextPath) {
      resolved.searchParams.set('next', nextPath)
    }

    resolved.searchParams.set('provider', provider)

    if (typeof window !== 'undefined') {
      const callbackUrl = buildCallbackUrl(provider, nextPath)
      if (!resolved.searchParams.has('callbackUrl')) {
        resolved.searchParams.set('callbackUrl', callbackUrl)
      }
      if (!resolved.searchParams.has('callback_url')) {
        resolved.searchParams.set('callback_url', callbackUrl)
      }
      if (!resolved.searchParams.has('redirect_uri')) {
        resolved.searchParams.set('redirect_uri', callbackUrl)
      }
      if (!resolved.searchParams.has('origin')) {
        resolved.searchParams.set('origin', window.location.origin)
      }
    }

    if (resolved.origin === 'http://localhost') {
      return `${resolved.pathname}${resolved.search}`
    }

    return resolved.toString()
  } catch {
    return rawUrl
  }
}

export function getSocialProviderLinks(nextPath: string): SocialProviderLink[] {
  const providers: Array<{ id: SocialProvider; label: string; rawUrl: string | undefined }> = [
    { id: 'google', label: 'Continue with Google', rawUrl: process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL },
    { id: 'x', label: 'Continue with X', rawUrl: process.env.NEXT_PUBLIC_X_AUTH_URL },
  ]

  return providers.map((provider) => {
    const normalized = provider.rawUrl?.trim() || buildDefaultProviderUrl(provider.id)
    return {
      id: provider.id,
      label: provider.label,
      enabled: Boolean(normalized),
      href: normalized ? appendProviderParams(normalized, provider.id, nextPath) : null,
    }
  })
}

export function getSocialProviderLabel(provider: SocialProvider | null): string {
  if (provider === 'google') {
    return 'Google'
  }

  if (provider === 'x') {
    return 'X'
  }

  return 'social'
}

export function resolveSocialAuthCallbackFromLocation(input: { search: string; hash?: string }): SocialAuthCallbackResolution {
  const searchParams = new URLSearchParams(input.search.replace(/^\?/, ''))
  const hashParams = new URLSearchParams(String(input.hash || '').replace(/^#/, ''))
  const mergedParams = new URLSearchParams(searchParams)

  hashParams.forEach((value, key) => {
    if (!mergedParams.has(key)) {
      mergedParams.set(key, value)
    }
  })

  const provider = normalizeProvider(getParamValue(mergedParams, ['provider']))
  const nextPath = getParamValue(mergedParams, ['next']) || '/workspace'
  const directPayload = coerceAuthResponse(
    parseStructuredValue<Record<string, unknown>>(getParamValue(mergedParams, ['auth', 'payload', 'session']))
  )

  if (directPayload) {
    return {
      status: 'success',
      provider,
      nextPath,
      payload: directPayload,
    }
  }

  const flatUser = coerceUser(
    parseStructuredValue<Record<string, unknown>>(getParamValue(mergedParams, ['user', 'profile']))
  )
  const token = getParamValue(mergedParams, ['token'])
  const sessionId = getParamValue(mergedParams, ['sessionId', 'session_id'])
  const expiresAt = getParamValue(mergedParams, ['expiresAt', 'expires_at'])
  const accessTier = getParamValue(mergedParams, ['accessTier', 'access_tier'])

  if (token && sessionId && expiresAt && flatUser) {
    return {
      status: 'success',
      provider,
      nextPath,
      payload: {
        token,
        sessionId,
        expiresAt,
        user: flatUser,
        ...(accessTier ? { accessTier } : {}),
      },
    }
  }

  const errorMessage = getParamValue(mergedParams, ['error_description', 'error', 'message'])
  if (errorMessage) {
    return {
      status: 'error',
      provider,
      nextPath,
      error: decodeUrlComponent(errorMessage),
    }
  }

  if (getParamValue(mergedParams, ['code'])) {
    return {
      status: 'incomplete',
      provider,
      nextPath,
      error: 'The OAuth provider returned an authorization code, but this dashboard deployment needs the auth start URL to finish the exchange and redirect back with token, sessionId, expiresAt, and user payload data.',
    }
  }

  return {
    status: 'incomplete',
    provider,
    nextPath,
    error: 'The social login callback did not include a usable session payload.',
  }
}