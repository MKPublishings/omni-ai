'use client'

import Script from 'next/script'
import { ReactNode, useEffect } from 'react'
import { captureUtmAttribution, trackEvent, trackPageView } from '@/lib/analytics'

interface AnalyticsProviderProps {
  children: ReactNode
}

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

function trackCurrentLocation() {
  const currentUrl = new URL(window.location.href)
  const attribution = captureUtmAttribution(currentUrl.searchParams)
  const path = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`

  trackPageView(path, attribution)

  if (currentUrl.pathname === '/') {
    trackEvent('homepage_visit', attribution)
  }
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    const handleNavigation = () => {
      trackCurrentLocation()
    }

    window.history.pushState = function pushState(...args) {
      originalPushState.apply(this, args)
      handleNavigation()
    }

    window.history.replaceState = function replaceState(...args) {
      originalReplaceState.apply(this, args)
      handleNavigation()
    }

    window.addEventListener('popstate', handleNavigation)
    trackCurrentLocation()

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener('popstate', handleNavigation)
    }
  }, [])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-analytics-event]') : null
      if (!target) {
        return
      }

      const eventName = target.dataset.analyticsEvent
      if (!eventName) {
        return
      }

      trackEvent(eventName, {
        location: target.dataset.analyticsLocation || undefined,
        label: target.dataset.analyticsLabel || target.textContent?.trim() || undefined,
      })
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <>
      {gaMeasurementId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
          <Script id="ion-ga" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} window.gtag = gtag; gtag('js', new Date()); gtag('config', '${gaMeasurementId}', { send_page_view: false });`}
          </Script>
        </>
      ) : null}
      {posthogKey ? (
        <Script id="ion-posthog" strategy="afterInteractive">
          {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split('.');2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement('script')).type='text/javascript',p.async=!0,p.src=s.api_host.replace('.i.posthog.com','-assets.i.posthog.com')+'/static/array.js',(r=t.getElementsByTagName('script')[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a='posthog',u.people=u.people||[],u.toString=function(t){var e='posthog';return'posthog'!==a&&(e+='.'+a),t||(e+=' (stub)'),e},u.people.toString=function(){return u.toString(1)+'.people (stub)'},o='capture identify alias people.set people.set_once people.unset people.increment people.append register register_once unregister opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing reset isFeatureEnabled onFeatureFlags setPersonProperties group reloadFeatureFlags'.split(' '),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]); window.posthog.init('${posthogKey}', { api_host: '${posthogHost}', capture_pageview: false });`}
        </Script>
      ) : null}
      {children}
    </>
  )
}