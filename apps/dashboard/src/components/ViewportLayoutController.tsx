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

  const gutterRatio = width < 768 ? 0.05 : 0.1
  const gutter = width * gutterRatio

  const maxWidth = Math.max(width - gutter * 2, 0)
  const commandMaxWidth = shape === 'portrait'
    ? maxWidth
    : shape === 'ultrawide'
      ? Math.min(maxWidth * 0.42, 960)
      : shape === 'wide'
        ? Math.min(maxWidth * 0.4, 840)
        : Math.min(maxWidth * 0.38, 760)

  const panelPadding = density === 'compact' ? 16 : density === 'expanded' ? 28 : 24
  const statMinHeight = density === 'compact' ? 124 : density === 'expanded' ? 176 : 152
  const tableCellX = density === 'expanded' ? 20 : 16
  const tableCellY = density === 'expanded' ? 16 : 12
  const contentGap = density === 'expanded' ? '1.75rem' : '1.5rem'

  root.dataset.viewportShape = shape
  root.dataset.viewportDensity = density
  root.style.setProperty('--site-shell-gutter', `${gutter}px`)
  root.style.setProperty('--site-shell-max-width', `${maxWidth}px`)
  root.style.setProperty('--site-shell-section-gap', width >= 1800 ? '1.75rem' : '1.5rem')
  root.style.setProperty('--workspace-command-max-width', `${commandMaxWidth}px`)
  root.style.setProperty('--workspace-panel-padding', `${panelPadding}px`)
  root.style.setProperty('--workspace-stat-min-height', `${statMinHeight}px`)
  root.style.setProperty('--workspace-table-cell-x', `${tableCellX}px`)
  root.style.setProperty('--workspace-table-cell-y', `${tableCellY}px`)
  root.style.setProperty('--workspace-content-gap', contentGap)
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