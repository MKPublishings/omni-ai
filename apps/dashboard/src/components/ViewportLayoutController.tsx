'use client'

import { useEffect } from 'react'

function applyViewportProfile() {
  const root = document.documentElement
  const viewport = window.visualViewport
  const width = Math.round(viewport?.width ?? window.innerWidth)
  const height = Math.round(viewport?.height ?? window.innerHeight)
  const ratio = width / Math.max(height, 1)

  let shape = 'standard'
  if (ratio < 0.9) {
    shape = 'portrait'
  } else if (ratio > 2.1) {
    shape = 'ultrawide'
  } else if (ratio > 1.55) {
    shape = 'wide'
  }

  const density = width < 768 ? 'compact' : width < 1440 ? 'comfortable' : 'expanded'

  let gutter = 16
  if (shape === 'portrait') {
    gutter = width < 900 ? 14 : 20
  } else if (shape === 'ultrawide') {
    gutter = width < 2200 ? 28 : 36
  } else if (shape === 'wide') {
    gutter = width < 1600 ? 24 : 32
  } else {
    gutter = width < 1024 ? 16 : 24
  }

  const maxWidth = Math.max(width - gutter * 2, 0)

  root.dataset.viewportShape = shape
  root.dataset.viewportDensity = density
  root.style.setProperty('--site-shell-gutter', `${gutter}px`)
  root.style.setProperty('--site-shell-max-width', `${maxWidth}px`)
  root.style.setProperty('--site-shell-section-gap', width >= 1800 ? '1.75rem' : '1.5rem')
}

export function ViewportLayoutController() {
  useEffect(() => {
    let frame = 0

    const schedule = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(applyViewportProfile)
    }

    schedule()

    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    window.addEventListener('focus', schedule)
    window.addEventListener('pageshow', schedule)
    document.addEventListener('visibilitychange', schedule)
    window.visualViewport?.addEventListener('resize', schedule)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', schedule)
      window.removeEventListener('focus', schedule)
      window.removeEventListener('pageshow', schedule)
      document.removeEventListener('visibilitychange', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    }
  }, [])

  return null
}