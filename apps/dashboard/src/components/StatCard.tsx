import React, { forwardRef, HTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { TrendDownIcon, TrendFlatIcon, TrendUpIcon } from './icons'

type TrendDirection = 'up' | 'down' | 'neutral'

const SPARKLINE_WIDTH = 120
const SPARKLINE_HEIGHT = 32
const SPARKLINE_PADDING = 3

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  trend?: {
    direction: TrendDirection
    value: string
  }
  sparklineValues?: number[]
}

function normalizeSparklineValues(values: number[]): number[] {
  return values.filter((value) => Number.isFinite(value))
}

function buildSparklinePath(values: number[]): string {
  const points = normalizeSparklineValues(values)
  if (points.length === 0) {
    return ''
  }

  const minValue = Math.min(...points)
  const maxValue = Math.max(...points)
  const innerWidth = SPARKLINE_WIDTH - SPARKLINE_PADDING * 2
  const innerHeight = SPARKLINE_HEIGHT - SPARKLINE_PADDING * 2
  const denominator = Math.max(maxValue - minValue, 1)

  return points
    .map((value, index) => {
      const x = SPARKLINE_PADDING + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth)
      const normalized = (value - minValue) / denominator
      const y = SPARKLINE_HEIGHT - SPARKLINE_PADDING - normalized * innerHeight
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

const TrendIcon = ({ direction }: { direction: TrendDirection }) => {
  const iconClass = "w-3 h-3"
  switch (direction) {
    case 'up':
      return <TrendUpIcon className={clsx(iconClass, 'text-green-400')} />
    case 'down':
      return <TrendDownIcon className={clsx(iconClass, 'text-amber-signal-500')} />
    case 'neutral':
      return <TrendFlatIcon className={clsx(iconClass, 'text-quantum-white/40')} />
  }
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, trend, sparklineValues, className, ...props }, ref) => {
    const sparklinePath = Array.isArray(sparklineValues) ? buildSparklinePath(sparklineValues) : ''

    return (
      <div
        ref={ref}
        className={clsx(
          'ix-glass-sovereign min-w-0 min-h-[var(--workspace-stat-min-height)] p-4 sm:p-[var(--workspace-panel-padding)]',
          className
        )}
        {...props}
      >
        <div className="flex h-full flex-col">
          <div className="break-words text-xl font-bold leading-tight text-quantum-white sm:text-2xl xl:text-3xl">
            {value}
          </div>

          <div className="mt-2 text-[11px] font-medium uppercase leading-5 tracking-[0.22em] text-quantum-white/52 sm:text-xs">
            {title}
          </div>

          {trend && (
            <div className="mt-auto flex items-center justify-end pt-4">
              <TrendIcon direction={trend.direction} />
              <span className={clsx(
                "ml-1 text-xs font-medium",
                trend.direction === 'up' && "text-green-400",
                trend.direction === 'down' && "text-amber-signal-500",
                trend.direction === 'neutral' && "text-quantum-white/40"
              )}>
                {trend.value}
              </span>
            </div>
          )}

          {sparklinePath && (
            <div className="mt-3" aria-hidden="true">
              <svg
                viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                className="h-8 w-full overflow-visible"
                preserveAspectRatio="none"
              >
                <path
                  d={sparklinePath}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-spectral-cyan-400"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    )
  }
)

StatCard.displayName = 'StatCard'