'use client'

import { Auth0Provider, type AppState } from '@auth0/auth0-react'
import { useRouter } from 'next/navigation'
import { getAuth0ClientConfig, getAuth0ReturnToUrl } from '@/lib/auth0-config'

export function Auth0RuntimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const auth0ClientConfig = getAuth0ClientConfig()
  const auth0ReturnToUrl = getAuth0ReturnToUrl()

  if (!auth0ClientConfig.enabled) {
    return <>{children}</>
  }

  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin.replace(/\/+$/, '')

    if (currentOrigin !== auth0ClientConfig.appOrigin) {
      return <>{children}</>
    }
  }

  const handleRedirectCallback = (appState?: AppState) => {
    router.replace(appState?.returnTo || '/')
  }

  return (
    <Auth0Provider
      authorizationParams={{ redirect_uri: auth0ReturnToUrl }}
      clientId={auth0ClientConfig.clientId}
      domain={auth0ClientConfig.domain}
      onRedirectCallback={handleRedirectCallback}
    >
      {children}
    </Auth0Provider>
  )
}
