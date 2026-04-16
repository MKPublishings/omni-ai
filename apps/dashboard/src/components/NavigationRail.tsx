import { forwardRef, HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface NavigationRailProps extends HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean
  mobileOpen?: boolean
  mobileViewport?: boolean
  onRequestClose?: () => void
  userName?: string
  userRole?: string
  userInitial?: string
}

interface NavItemProps extends HTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
  active?: boolean
  collapsed?: boolean
}

const NavItem = forwardRef<HTMLButtonElement, NavItemProps>(
  ({ icon, label, active, collapsed, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'relative flex items-center w-full rounded-xl px-3.5 py-3 text-left transition-all duration-quick ease-sovereign',
          'hover:bg-quantum-white/10 focus:outline-none focus:ring-2 focus:ring-ion-blue-500',
          active && 'bg-ion-blue-500 text-quantum-white',
          !active && 'text-quantum-white/64 hover:text-quantum-white',
          collapsed ? 'justify-center' : 'justify-start',
          className
        )}
        title={collapsed ? label : undefined}
        {...props}
      >
        <div className="flex-shrink-0 w-6 h-6">
          {icon}
        </div>
        {!collapsed && (
          <span className="ml-3 text-sm font-medium truncate">
            {label}
          </span>
        )}
        {active && !collapsed && (
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-quantum-white rounded-r-md" />
        )}
      </button>
    )
  }
)

NavItem.displayName = 'NavItem'

export const NavigationRail = forwardRef<HTMLDivElement, NavigationRailProps>(
  ({ collapsed = false, mobileOpen = true, mobileViewport = false, onRequestClose, userName = 'Ionirix User', userRole = 'Operator', userInitial = 'I', className, children, ...props }, ref) => {
    const expanded = mobileViewport ? mobileOpen : !collapsed

    return (
      <div
        ref={ref}
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-quantum-white/8 bg-pine-black-900/95 backdrop-blur-xl shadow-2xl',
          'transition-all duration-standard ease-sovereign md:relative md:z-auto md:translate-x-0 md:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'md:w-20' : 'md:w-72',
          'w-[min(86vw,22rem)] md:max-w-none',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-quantum-white/8 px-4 py-4 md:h-16 md:py-0">
          <div className="flex min-w-0 items-center">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-ion-blue-500">
              <span className="text-sm font-bold text-quantum-white">IX</span>
            </div>
            {expanded && (
              <span className="ml-3 truncate text-lg font-semibold text-quantum-white">
                Ionirix
              </span>
            )}
          </div>

          {mobileViewport && (
            <button
              type="button"
              aria-label="Close navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-quantum-white/10 text-quantum-white/72 transition hover:bg-quantum-white/8 hover:text-quantum-white md:hidden"
              onClick={onRequestClose}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {children}
        </nav>

        <div className="p-4 border-t border-quantum-white/8">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0 w-8 h-8 bg-spectral-cyan-500 rounded-full flex items-center justify-center">
              <span className="text-pine-black-900 font-medium text-sm">{userInitial}</span>
            </div>
            {expanded && (
              <div className="ml-3 min-w-0">
                <p className="text-quantum-white text-sm font-medium truncate">{userName}</p>
                <p className="text-quantum-white/64 text-xs truncate">{userRole}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)

NavigationRail.displayName = 'NavigationRail'

export { NavItem }