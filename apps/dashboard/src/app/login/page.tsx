'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Auth0LoginPanel } from '@/components/Auth0LoginPanel'
import { clearAuthSession, fetchApi, getStoredToken, resendVerification, storeAuthSession } from '@/lib/auth'
import { fetchOnboardingWorkspace } from '@/lib/dashboard'
import { trackEvent } from '@/lib/analytics'
import { getSocialProviderLinks } from '@/lib/social-auth'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { AssistantSparkIcon } from '@/components/icons'
import { clearWorkspaceFormation, loadWorkspaceFormation } from '@/onboarding'

type AuthMode = 'login' | 'signup'

function buildVerificationDeliveryNotice(input: {
  sent?: boolean
  error?: string
  fallbackLink?: boolean
  successMessage: string
  fallbackMessage: string
}) {
  if (input.sent) {
    return input.successMessage
  }

  const detail = String(input.error || '').trim()
  if (detail) {
    return `Verification email delivery failed: ${detail}${input.fallbackLink ? ' Use the verification link below while mail delivery is being fixed.' : ''}`
  }

  return input.fallbackMessage
}

async function resolvePostAuthRoute(defaultPath: string, identifier?: string): Promise<string> {
  try {
    const workspace = await fetchOnboardingWorkspace()
    if (workspace?.primaryRoute) {
      clearWorkspaceFormation()
      if (identifier) {
        clearWorkspaceFormation(identifier)
      }
      return workspace.primaryRoute
    }
  } catch {
    // Fall through to local backup or default route.
  }

  const localFormation = loadWorkspaceFormation(identifier)
  if (localFormation?.primaryRoute) {
    return localFormation.primaryRoute
  }

  return defaultPath
}

function buildSuggestedUsername(displayName: string, email: string) {
  const seed = (displayName || email.split('@')[0] || 'ion-operator')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')

  if (seed.length >= 3) {
    return seed.slice(0, 32)
  }

  return `ion-${seed || 'user'}000`.slice(0, 32)
}

function appendNextParam(url: string, nextPath: string) {
  try {
    const resolved = new URL(url, window.location.origin)
    if (nextPath) {
      resolved.searchParams.set('next', nextPath)
    }
    return `${resolved.pathname}${resolved.search}`
  } catch {
    return url
  }
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const requestedMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const nextPath = searchParams.get('next') || (requestedMode === 'signup' ? '/assistant?starter=Give%20me%20a%2060-second%20tour%20of%20ION%20and%20suggest%20my%20first%20three%20actions.' : '/workspace')
  const [mode, setMode] = useState<AuthMode>(requestedMode)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificationNotice, setVerificationNotice] = useState('')
  const [verificationUrl, setVerificationUrl] = useState('')
  const [showUsernameField, setShowUsernameField] = useState(false)
  const router = useRouter()
  const suggestedUsername = useMemo(() => buildSuggestedUsername(displayName, email), [displayName, email])
  const resolvedUsername = (showUsernameField ? username : suggestedUsername).trim().toLowerCase()
  const socialProviders = useMemo(() => getSocialProviderLinks(nextPath), [nextPath])

  useEffect(() => {
    setMode(requestedMode)
  }, [requestedMode])

  // Check if already authenticated
  useEffect(() => {
    const token = getStoredToken()
    if (token) {
      router.push(nextPath)
    }
  }, [nextPath, router])

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError('')
    setVerificationNotice('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        trackEvent('signup_started', { surface: 'login-page' })
      }

      if (mode === 'signup' && password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      const response = await fetchApi(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          mode === 'signup'
            ? { email, password, displayName, username: resolvedUsername }
            : { identifier: email, password }
        ),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'EMAIL_VERIFICATION_REQUIRED') {
          setVerificationNotice(
            buildVerificationDeliveryNotice({
              sent: Boolean(data.verificationEmailSent),
              error: typeof data.verificationEmailError === 'string' ? data.verificationEmailError : data.error,
              fallbackLink: Boolean(data.verificationUrl),
              successMessage: 'Email verification is required before signing in. Check your inbox for the latest verification email.',
              fallbackMessage: 'Email verification is required before signing in. Email delivery failed, so use the verification link below.',
            })
          )
          setVerificationUrl(data.verificationUrl || '')
        }
        if (mode === 'signup' && /username/i.test(String(data.error || ''))) {
          setShowUsernameField(true)
        }
        throw new Error(data.error || 'Login failed')
      }

      if (data.verificationRequired) {
        clearAuthSession()
        trackEvent('signup_completed', {
          surface: 'login-page',
          verification_required: true,
        })
        setVerificationNotice(
          buildVerificationDeliveryNotice({
            sent: Boolean(data.verificationEmailSent),
            error: typeof data.verificationEmailError === 'string' ? data.verificationEmailError : '',
            fallbackLink: Boolean(data.verificationUrl),
            successMessage: 'Account created. A verification email has been sent to your inbox.',
            fallbackMessage: 'Account created, but verification email delivery failed. Use the verification link below before signing in.',
          })
        )
        const verificationRoute = data.verificationUrl ? appendNextParam(data.verificationUrl, nextPath) : ''
        setVerificationUrl(verificationRoute)
        if (verificationRoute && data.verificationEmailSent === false) {
          router.push(verificationRoute)
          return
        }
        setMode('login')
        return
      }

      storeAuthSession(data)
      if (mode === 'signup') {
        trackEvent('signup_completed', {
          surface: 'login-page',
          verification_required: false,
        })
      }
      const destination = await resolvePostAuthRoute(nextPath, email)
      router.push(destination)

    } catch (err) {
      if (!(err instanceof Error && err.message.includes('verification'))) {
        clearAuthSession()
      }
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setError('')
    setVerificationNotice('')

    try {
      const payload = await resendVerification(email)
      setVerificationNotice(
        payload.alreadyVerified
          ? 'This account is already verified. You can sign in now.'
          : buildVerificationDeliveryNotice({
              sent: Boolean(payload.verificationEmailSent),
              error: payload.verificationEmailError,
              fallbackLink: Boolean(payload.verificationUrl),
              successMessage: 'A fresh verification email has been sent.',
              fallbackMessage: 'Verification email delivery failed. Use the fresh verification link below.',
            })
      )
      setVerificationUrl(payload.verificationUrl || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pine-black-900 px-[5%] py-4 sm:p-4">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-transparent via-spectral-cyan-500/5 to-transparent rotate-45 animate-shimmer" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-transparent via-ion-blue-500/5 to-transparent -rotate-12 animate-shimmer-delayed" />
      </div>

      <GlassCard tier={1} className="w-full max-w-lg p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-spectral-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AssistantSparkIcon className="w-8 h-8 text-pine-black-900" />
          </div>
          <h1 className="text-2xl font-bold text-quantum-white mb-2">ION AI Dashboard</h1>
          <p className="text-quantum-white/64">
            {mode === 'signup'
              ? 'Create an account and move into your first guided prompt.'
              : 'Enter your credentials to get back into the workspace.'}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-quantum-white/42">Email auth is live. Auth0 Universal Login is wired client-side for the production origin.</p>
        </div>

        <div className="flex bg-quantum-white/5 rounded-md p-1 mb-6">
          <button
            type="button"
            className={`flex-1 rounded-sm py-2 text-sm transition-colors ${mode === 'login' ? 'bg-ion-blue-500 text-quantum-white' : 'text-quantum-white/64 hover:text-quantum-white'}`}
            onClick={() => handleModeChange('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 rounded-sm py-2 text-sm transition-colors ${mode === 'signup' ? 'bg-ion-blue-500 text-quantum-white' : 'text-quantum-white/64 hover:text-quantum-white'}`}
            onClick={() => handleModeChange('signup')}
          >
            Sign Up
          </button>
        </div>

        <div className="mb-6 space-y-3">
          {socialProviders.map((provider) => provider.enabled && provider.href ? (
            <Link
              key={provider.id}
              href={provider.href}
              className="flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-quantum-white/12 bg-quantum-white/[0.03] px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-quantum-white/8"
              data-analytics-event={`social_${provider.id}_clicked`}
              data-analytics-location="login-form"
            >
              {provider.label}
            </Link>
          ) : (
            <button
              key={provider.id}
              type="button"
              disabled
              className="flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-quantum-white/8 bg-quantum-white/[0.02] px-4 py-2 text-sm font-medium text-quantum-white/42"
            >
              {provider.label}
            </button>
          ))}
          <p className="text-center text-xs text-quantum-white/40">
            Google and X login activate when their auth start URLs are configured for this deployment.
          </p>
        </div>

        <Auth0LoginPanel />

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'signup' && (
            <div>
              <Input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full"
              />
            </div>
          )}

          {mode === 'signup' && showUsernameField && (
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full"
              />
            </div>
          )}

          {mode === 'signup' && !showUsernameField ? (
            <div className="rounded-2xl border border-quantum-white/10 bg-quantum-white/[0.03] px-4 py-3 text-sm text-quantum-white/62">
              Username reserved as <span className="font-medium text-quantum-white">{resolvedUsername || 'ion-operator'}</span>. You can change it later.
            </div>
          ) : null}

          <div>
            <Input
              type={mode === 'signup' ? 'email' : 'text'}
              placeholder={mode === 'signup' ? 'Email address' : 'Email or username'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>
          )}

          {error && (
            <div className="text-amber-signal-500 text-sm text-center bg-amber-signal-500/10 border border-amber-signal-500/20 rounded-md p-3">
              {error}
            </div>
          )}

          {verificationNotice && (
            <div className="space-y-3 rounded-2xl border border-spectral-cyan-500/20 bg-spectral-cyan-500/10 p-4 text-sm text-spectral-cyan-200">
              <p>{verificationNotice}</p>
              {verificationUrl && (
                <Link href={verificationUrl} className="inline-flex rounded-full border border-spectral-cyan-400/30 px-4 py-2 text-sm text-spectral-cyan-100 transition hover:bg-spectral-cyan-400/10">
                  Open verification link directly
                </Link>
              )}
              {mode === 'login' && email && (
                <button type="button" onClick={handleResendVerification} className="block text-left text-sm text-spectral-cyan-100 underline underline-offset-4">
                  Resend verification email
                </button>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            glow
            data-analytics-event={mode === 'signup' ? 'signup_submit_clicked' : 'login_submit_clicked'}
            data-analytics-location="login-form"
          >
            {isLoading
              ? mode === 'signup'
                ? 'Creating account...'
                : 'Authenticating...'
              : mode === 'signup'
                ? 'Create Account'
                : 'Access ION AI'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-quantum-white/40 text-sm">
            Email sign-up is enabled. Passwords require at least 8 characters with a letter and a number.
          </p>
          <p className="mt-3 text-sm text-quantum-white/56">
            Prefer guided setup? <Link href="/onboarding" className="text-spectral-cyan-400 transition hover:text-spectral-cyan-300">Open the onboarding flow</Link>
          </p>
          <p className="mt-3 text-sm text-quantum-white/56">
            <Link href="/" className="text-spectral-cyan-400 transition hover:text-spectral-cyan-300">Return to the public site</Link>
          </p>
        </div>
      </GlassCard>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-pine-black-900 px-[5%] py-4 text-sm text-quantum-white/68 sm:p-4">Loading sign-in...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}