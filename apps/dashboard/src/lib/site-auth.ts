'use client'

import { useAuth0, type User as Auth0SdkUser } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { type AuthUser, clearAuthSession, getStoredToken, getStoredUser, storeUserProfile } from '@/lib/auth'
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

export function useSiteAuthState() {
  const { isAuthenticated, isLoading, logout, user } = useAuth0()
  const [localSession, setLocalSession] = useState(readLocalSession)

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

  useEffect(() => {
    if (!auth0User) {
      return
    }

    storeUserProfile(auth0User)
    setLocalSession(readLocalSession())
  }, [auth0User])

  const sessionUser = auth0User || localSession.user
  const hasWorkspaceSession = Boolean(localSession.token)
  const isSiteAuthenticated = Boolean(sessionUser || hasWorkspaceSession)

  const signOut = async () => {
    clearAuthSession()

    if (isAuthenticated) {
      await logout({
        logoutParams: {
          returnTo: getAuth0ReturnToUrl(),
        },
      })
    }
  }

  return {
    authResolved: !isLoading,
    hasWorkspaceSession,
    isAuth0Authenticated: isAuthenticated,
    isSiteAuthenticated,
    sessionUser,
    signOut,
  }
}
