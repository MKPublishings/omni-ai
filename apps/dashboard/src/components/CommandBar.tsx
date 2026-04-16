import { forwardRef, HTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { Input } from './Input'
import { Button } from './Button'

interface CommandBarProps extends HTMLAttributes<HTMLDivElement> {
  searchValue?: string
  onSearchChange?: (value: string) => void
  breadcrumbs?: string[]
}

export const CommandBar = forwardRef<HTMLDivElement, CommandBarProps>(
  ({ searchValue, onSearchChange, breadcrumbs = [], className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'ix-glass-ambient border-b border-quantum-white/8 px-3 py-3 sm:px-4 md:px-6',
          'flex flex-col gap-3 md:h-14 md:flex-row md:items-center md:justify-between md:py-0',
          className
        )}
        {...props}
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 bg-ion-blue-500 rounded-md flex items-center justify-center">
              <span className="text-quantum-white font-bold text-sm">IX</span>
            </div>
            {breadcrumbs.length > 0 && (
              <nav className="flex min-w-0 items-center space-x-2 overflow-x-auto whitespace-nowrap">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && (
                      <span className="text-quantum-white/40 mx-2">/</span>
                    )}
                    <span className={clsx(
                      'text-sm font-medium',
                      index === breadcrumbs.length - 1
                        ? 'text-quantum-white'
                        : 'text-quantum-white/64'
                    )}>
                      {crumb}
                    </span>
                  </div>
                ))}
              </nav>
            )}
          </div>

          <div className="hidden items-center space-x-2 md:flex">
            <Button variant="ghost" size="sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </Button>
            <Button variant="ghost" size="sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 0112 21c7.962 0 12-1.21 12-2.683m-12 2.683a17.925 17.925 0 01-7.132-8.317M12 21c4.411 0 8-4.03 8-9s-3.589-9-8-9-8 4.03-8 9a9.06 9.06 0 001.832 5.683L4 21l4.868-2.317z" />
              </svg>
            </Button>
            <div className="w-8 h-8 bg-spectral-cyan-500 rounded-full flex items-center justify-center ml-1">
              <span className="text-pine-black-900 font-medium text-sm">M</span>
            </div>
          </div>
        </div>

        <div className="w-full md:mx-8 md:max-w-md md:flex-1">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search across Ionirix..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-11 w-full rounded-xl pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-quantum-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

CommandBar.displayName = 'CommandBar'