import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'
import { Button } from './Button'

interface DataPanelProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  action?: ReactNode
  footer?: ReactNode
  loading?: boolean
}

export const DataPanel = forwardRef<HTMLDivElement, DataPanelProps>(
  ({ title, subtitle, action, footer, loading, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'ix-glass-sovereign flex flex-col',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-quantum-white/8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-quantum-white">
                {title}
              </h3>
              {subtitle && (
                <p className="text-quantum-white/64 text-sm mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {action && (
              <div className="flex-shrink-0">
                {action}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-quantum-white/20 h-8 w-8"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-quantum-white/20 rounded w-3/4"></div>
                  <div className="h-4 bg-quantum-white/20 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-quantum-white/8 bg-quantum-white/4">
            {footer}
          </div>
        )}
      </div>
    )
  }
)

DataPanel.displayName = 'DataPanel'