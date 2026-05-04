'use client'

import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useState } from 'react'
import { getAuth0ClientConfig, getAuth0ReturnToUrl } from '@/lib/auth0-config'

const auth0ClientConfig = getAuth0ClientConfig()
const auth0ReturnToUrl = getAuth0ReturnToUrl()

export function Auth0LoginPanel({ nextPath = '/workspace' }: { nextPath?: string }) {
  const { error, isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0()
  const [currentOrigin, setCurrentOrigin] = useState('')

  useEffect(() => {
    setCurrentOrigin(window.location.origin.replace(/\/+$/, ''))
  }, [])

  const isConfiguredOrigin = !currentOrigin || currentOrigin === auth0ClientConfig.appOrigin
  const areActionsDisabled = isLoading || !isConfiguredOrigin

  const handleSignup = async () => {
    await loginWithRedirect({
      appState: { returnTo: nextPath },
      authorizationParams: {
        redirect_uri: auth0ReturnToUrl,
        screen_hint: 'signup',
      },
    })
  }

  const handleLogin = async () => {
    await loginWithRedirect({
      appState: { returnTo: nextPath },
      authorizationParams: {
        redirect_uri: auth0ReturnToUrl,
      },
    })
  }

  const handleLogout = async () => {
    await logout({
      logoutParams: {
        returnTo: auth0ReturnToUrl,
      },
    })
  }

  return (
    <div className="rounded-3xl border border-spectral-cyan-500/16 bg-gradient-to-br from-spectral-cyan-500/[0.08] to-ion-blue-500/[0.05] p-5 text-sm text-quantum-white sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-spectral-cyan-300/80">Primary Sign In</p>
          <h2 className="mt-2 text-xl font-semibold text-quantum-white">Continue with Auth0</h2>
        </div>
        <span className="rounded-full border border-spectral-cyan-400/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-spectral-cyan-200/80">
          Universal Login
        </span>
      </div>

      <p className="mt-3 text-quantum-white/68">
        Use the hosted Auth0 flow for the cleanest sign-in and sign-up path.
      </p>

      {!isConfiguredOrigin ? (
        <p className="mt-3 rounded-xl border border-amber-signal-500/20 bg-amber-signal-500/10 px-3 py-2 text-amber-signal-500">
          This page is running on {currentOrigin || 'an unknown origin'}. Auth0 is currently allowed only on {auth0ClientConfig.appOrigin}, so authentication will return there.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border border-amber-signal-500/20 bg-amber-signal-500/10 px-3 py-2 text-amber-signal-500">
          Auth0 error: {error.message}
        </p>
      ) : null}

      {isAuthenticated ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-quantum-white/72">
            Signed in as <span className="font-medium text-quantum-white">{user?.email || user?.name || 'your account'}</span>.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-quantum-white/14 bg-quantum-white/[0.03] px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-quantum-white/8"
          >
            Log out
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSignup}
            disabled={areActionsDisabled}
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-spectral-cyan-500 px-5 py-2 text-sm font-medium text-pine-black-900 transition hover:bg-spectral-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Loading...' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={handleLogin}
            disabled={areActionsDisabled}
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-quantum-white/14 bg-quantum-white/[0.03] px-5 py-2 text-sm font-medium text-quantum-white transition hover:bg-quantum-white/8 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Loading...' : 'Sign in'}
          </button>
        </div>
      )}
    </div>
  )
}
