'use client'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    posthog?: {
      capture?: (event: string, properties?: Record<string, unknown>) => void
    }
  }
}

const UTM_STORAGE_KEY = 'ion-utm-attribution'

function safeParseAttribution(value: string | null): Record<string, string> {
  if (!value) {
    return {}
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function captureUtmAttribution(searchParams: URLSearchParams) {
  if (typeof window === 'undefined') {
    return {}
  }

  const attribution = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
    .reduce<Record<string, string>>((result, key) => {
      const value = searchParams.get(key)
      if (value) {
        result[key] = value
      }
      return result
    }, {})

  if (Object.keys(attribution).length > 0) {
    window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(attribution))
    return attribution
  }

  return safeParseAttribution(window.sessionStorage.getItem(UTM_STORAGE_KEY))
}

export function getStoredAttribution() {
  if (typeof window === 'undefined') {
    return {}
  }

  return safeParseAttribution(window.sessionStorage.getItem(UTM_STORAGE_KEY))
}

export function trackEvent(name: string, properties: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') {
    return
  }

  const payload = {
    ...getStoredAttribution(),
    ...properties,
  }

  window.gtag?.('event', name, payload)
  window.posthog?.capture?.(name, payload)
}

export function trackPageView(path: string, properties: Record<string, unknown> = {}) {
  trackEvent('page_view', {
    page_path: path,
    ...properties,
  })
}