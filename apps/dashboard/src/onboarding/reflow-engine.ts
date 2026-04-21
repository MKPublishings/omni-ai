import { clsx } from 'clsx'
import type { OnboardingState, ReflowLayout, ViewportProfile } from './types'

export function getViewportProfile(width: number, height: number): ViewportProfile {
  if (width < 768) {
    return { width, height, breakpoint: 'mobile' }
  }

  if (width < 1180) {
    return { width, height, breakpoint: 'tablet' }
  }

  return { width, height, breakpoint: 'desktop' }
}

export function resolveReflowLayout(viewport: ViewportProfile, state: OnboardingState): ReflowLayout {
  const stacked = viewport.breakpoint !== 'desktop'
  const focused = state.preferences.layoutMode === 'focus'
  const compactDensity = state.preferences.density === 'compact'
  const spaciousDensity = state.preferences.density === 'spacious'

  return {
    breakpoint: viewport.breakpoint,
    railPlacement: stacked ? 'top' : 'left',
    assistPlacement: stacked ? 'inline' : 'side',
    contentColumns: stacked ? 1 : 2,
    shellClassName: clsx(
      'grid items-start gap-4 lg:gap-6',
      stacked ? 'grid-cols-1' : 'lg:grid-cols-[minmax(220px,0.72fr)_minmax(0,1fr)] xl:grid-cols-[minmax(224px,0.66fr)_minmax(0,1.34fr)_minmax(272px,0.82fr)]',
    ),
    contentClassName: clsx(
      'min-w-0',
      stacked ? 'order-2' : 'lg:col-start-2',
      focused && !stacked && 'xl:pr-2',
      compactDensity ? 'space-y-4' : spaciousDensity ? 'space-y-6' : 'space-y-5',
    ),
    asideClassName: clsx(
      'min-w-0',
      stacked ? 'order-3' : 'lg:col-span-2 xl:col-span-1',
      state.preferences.sidebarPosition === 'hidden' && !stacked && 'xl:hidden',
    ),
  }
}
