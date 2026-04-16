import { forwardRef, HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface NavigationRailProps extends HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean
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
          'relative flex items-center w-full px-3 py-2 rounded-md text-left transition-all duration-quick ease-sovereign',
          'hover:bg-quantum-white/10 focus:outline-none focus:ring-2 focus:ring-ion-blue-500',
          active && 'bg-ion-blue-500 text-quantum-white',
          !active && 'text-quantum-white/64 hover:text-quantum-white',
          collapsed ? 'justify-center' : 'justify-start',
          className
        )}
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
  ({ collapsed = false, userName = 'Ionirix User', userRole = 'Operator', userInitial = 'I', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'flex flex-col bg-pine-black-900 border-r border-quantum-white/8',
          collapsed ? 'w-16' : 'w-64',
          'transition-all duration-standard ease-sovereign',
          className
        )}
        {...props}
      >
        {/* Logo/Brand */}
        <div className="flex items-center h-16 px-4 border-b border-quantum-white/8">
          <div className="flex-shrink-0 w-8 h-8 bg-ion-blue-500 rounded-md flex items-center justify-center">
            <span className="text-quantum-white font-bold text-sm">IX</span>
          </div>
          {!collapsed && (
            <span className="ml-3 text-quantum-white font-semibold text-lg">
              Ionirix
            </span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {children}
        </nav>

        {/* User Avatar */}
        <div className="p-4 border-t border-quantum-white/8">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-8 h-8 bg-spectral-cyan-500 rounded-full flex items-center justify-center">
              <span className="text-pine-black-900 font-medium text-sm">{userInitial}</span>
            </div>
            {!collapsed && (
              <div className="ml-3">
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