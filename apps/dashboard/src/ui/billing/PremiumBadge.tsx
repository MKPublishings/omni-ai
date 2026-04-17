'use client'

import React from 'react'
import { clsx } from 'clsx'

interface PremiumBadgeProps {
  compact?: boolean
  className?: string
  label?: string
}

export function PremiumBadge({ compact = false, className, label = 'Premium active' }: PremiumBadgeProps) {
  return (
    <span
      className={clsx(
        'ion-billing-premium-badge',
        compact && 'ion-billing-premium-badge-compact',
        className
      )}
    >
      <span className="ion-billing-premium-dot" aria-hidden="true" />
      {label}
    </span>
  )
}