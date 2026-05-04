'use client'

export type SocialProvider = 'google' | 'x'

export interface SocialProviderLink {
  id: SocialProvider
  label: string
  enabled: boolean
  href: string | null
}

function appendNextParam(rawUrl: string, nextPath: string): string {
  try {
    const resolved = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    if (nextPath) {
      resolved.searchParams.set('next', nextPath)
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
    const normalized = provider.rawUrl?.trim() || ''
    return {
      id: provider.id,
      label: provider.label,
      enabled: Boolean(normalized),
      href: normalized ? appendNextParam(normalized, nextPath) : null,
    }
  })
}