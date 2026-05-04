'use client'

import { useAuth0, type User as Auth0SdkUser } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { type AuthUser, clearAuthSession, exchangeAuth0Session, getStoredToken, getStoredUser, storeAuthSession } from '@/lib/auth'
import { getAuth0ReturnToUrl } from '@/lib/auth0-config'

function buildFallbackUsername(value: string): string {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')

  return normalized || 'ion-operator'
}

export function mapAuth0UserToAuthUser(user: Auth0SdkUser): AuthUser {
  const email = String(user.email || '')
  const displayName = String(user.name || user.nickname || email.split('@')[0] || 'ION Operator')

  return {
    id: String(user.sub || email || 'auth0-user'),
    username: buildFallbackUsername(String(user.nickname || email.split('@')[0] || user.sub || 'ion-operator')),
    email,
    displayName,
    role: 'member',
    emailVerified: Boolean(user.email_verified),
  }
}

function readLocalSession() {
  return {
    token: getStoredToken(),
    user: getStoredUser(),
  }
}

function normalizeIdentityValue(value: string | undefined | null): string {
  return String(value || '').trim().toLowerCase()
}

export function useSiteAuthState() {
  const { getAccessTokenSilently, isAuthenticated, isLoading, logout, user } = useAuth0()
  const [localSession, setLocalSession] = useState(readLocalSession)
  const [authSyncError, setAuthSyncError] = useState('')
  const [isAuthSyncing, setIsAuthSyncing] = useState(false)

  useEffect(() => {
    const sync = () => {
      setLocalSession(readLocalSession())
    }

    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('focus', sync)

    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  const auth0User = useMemo(() => {
    if (!isAuthenticated || !user) {
      return null
    }

    return mapAuth0UserToAuthUser(user)
  }, [isAuthenticated, user])

  const hasWorkspaceSession = Boolean(localSession.token && localSession.user)
  const needsAuth0SessionSync = Boolean(
    auth0User && (
      !localSession.token ||
      !localSession.user ||
      normalizeIdentityValue(localSession.user.email) !== normalizeIdentityValue(auth0User.email)
    )
  )
  const isResolvingWorkspaceSession = Boolean(auth0User && needsAuth0SessionSync) || isAuthSyncing
  const isSiteAuthenticated = hasWorkspaceSession && !needsAuth0SessionSync

  useEffect(() => {
    if (!auth0User || !needsAuth0SessionSync) {
      setIsAuthSyncing(false)
      setAuthSyncError('')
      return
    }

    let cancelled = false

    const syncAuth0Session = async () => {
      try {
        setIsAuthSyncing(true)
        setAuthSyncError('')

        const accessToken = await getAccessTokenSilently()
        const payload = await exchangeAuth0Session({
          accessToken,
          profile: {
            sub: user?.sub,
            email: user?.email,
            email_verified: user?.email_verified,
            name: user?.name,
            nickname: user?.nickname,
          },
        })

        if (cancelled) {
          return
        }

        storeAuthSession(payload)
        setLocalSession(readLocalSession())
      } catch (error) {
        if (cancelled) {
          return
        }

        clearAuthSession()
        setLocalSession(readLocalSession())
        setAuthSyncError(error instanceof Error ? error.message : 'Auth0 sign-in could not be completed.')
      } finally {
        if (!cancelled) {
          setIsAuthSyncing(false)
        }
      }
    }

    void syncAuth0Session()

    return () => {
      cancelled = true
    }
  }, [auth0User, getAccessTokenSilently, needsAuth0SessionSync, user])

  const sessionUser = hasWorkspaceSession ? localSession.user : null

  const signOut = async () => {
    clearAuthSession()
    setLocalSession(readLocalSession())
    setAuthSyncError('')

    if (isAuthenticated) {
      await logout({
        logoutParams: {
          returnTo: getAuth0ReturnToUrl(),
        },
      })
    }
  }

  return {
    authResolved: !isLoading && !isResolvingWorkspaceSession,
    authSyncError,
    hasWorkspaceSession,
    isAuth0Authenticated: isAuthenticated,
    isSiteAuthenticated,
    isSyncingWorkspaceSession: isAuthSyncing,
    sessionUser,
    signOut,
  }
}
