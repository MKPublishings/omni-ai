import { forwardRef, HTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { TrendDownIcon, TrendFlatIcon, TrendUpIcon } from './icons'

type TrendDirection = 'up' | 'down' | 'neutral'

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  trend?: {
    direction: TrendDirection
    value: string
  }
  sparkline?: boolean
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
  ({ title, value, trend, sparkline, className, ...props }, ref) => {
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

          {/* Sparkline placeholder */}
          {sparkline && (
            <div className="mt-3 h-8 flex items-end space-x-1">
              {[0.3, 0.5, 0.2, 0.8, 0.6, 0.9, 0.4, 0.7, 0.3, 0.8, 0.6, 1.0].map((height, i) => (
                <div
                  key={i}
                  className="bg-spectral-cyan-400 rounded-sm flex-1"
                  style={{ height: `${height * 100}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
)

StatCard.displayName = 'StatCard'