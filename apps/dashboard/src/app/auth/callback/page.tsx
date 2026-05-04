'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { clearAuthSession, storeAuthSession } from '@/lib/auth'
import { fetchOnboardingWorkspace } from '@/lib/dashboard'
import { getSocialProviderLabel, resolveSocialAuthCallbackFromLocation } from '@/lib/social-auth'
import { GlassCard } from '@/components/GlassCard'
import { clearWorkspaceFormation, loadWorkspaceFormation } from '@/onboarding'

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

function scrubCallbackUrl(nextPath: string) {
  if (typeof window === 'undefined') {
    return
  }

  const replacement = new URL('/auth/callback', window.location.origin)
  if (nextPath) {
    replacement.searchParams.set('next', nextPath)
  }

  window.history.replaceState({}, document.title, `${replacement.pathname}${replacement.search}`)
}

function SocialAuthCallbackPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Completing your sign-in...')

  const serializedSearch = useMemo(() => searchParams.toString(), [searchParams])

  useEffect(() => {
    let active = true

    const completeSignIn = async () => {
      const resolution = resolveSocialAuthCallbackFromLocation({
        search: serializedSearch ? `?${serializedSearch}` : '',
        hash: typeof window !== 'undefined' ? window.location.hash : '',
      })
      const providerLabel = getSocialProviderLabel(resolution.provider)

      scrubCallbackUrl(resolution.nextPath)

      if (resolution.status === 'success' && resolution.payload) {
        storeAuthSession(resolution.payload)
        trackEvent('social_login_completed', {
          provider: resolution.provider || 'unknown',
        })

        if (active) {
          setStatus('success')
          setMessage(`${providerLabel} sign-in completed. Redirecting to your workspace...`)
        }

        const destination = await resolvePostAuthRoute(resolution.nextPath, resolution.payload.user.email)
        router.replace(destination)
        return
      }

      clearAuthSession()
      trackEvent('social_login_failed', {
        provider: resolution.provider || 'unknown',
        reason: resolution.error || resolution.status,
      })

      if (!active) {
        return
      }

      setStatus('error')
      setMessage(resolution.error || `${providerLabel} sign-in could not be completed.`)
    }

    void completeSignIn()

    return () => {
      active = false
    }
  }, [router, serializedSearch])

  return (
    <div className="min-h-screen bg-pine-black-900 px-[5%] py-10 sm:px-4">
      <div className="mx-auto max-w-xl">
        <GlassCard className="p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-quantum-white/42">Ionirix</p>
          <h1 className="mt-3 text-2xl font-bold text-quantum-white">Social sign-in</h1>
          <p className="mt-4 text-sm leading-6 text-quantum-white/72">{message}</p>

          {status === 'error' && (
            <div className="mt-6 rounded-2xl border border-amber-signal-500/25 bg-amber-signal-500/8 p-4 text-sm leading-6 text-amber-signal-200">
              The provider entry URL must redirect back to this dashboard with a resolved session payload. Supported callback fields are auth or payload, or the flat fields token, sessionId, expiresAt, and user.
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex items-center rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">
              Return to login
            </Link>
            <Link href="/" className="inline-flex items-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">
              Public home
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

export default function SocialAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-pine-black-900 px-[5%] py-4 text-sm text-quantum-white/68 sm:p-4">Completing sign-in...</div>}>
      <SocialAuthCallbackPageContent />
    </Suspense>
  )
}