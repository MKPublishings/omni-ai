import { forwardRef, ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  glow?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-ion-blue-500 text-quantum-white border border-ion-blue-500 hover:bg-ion-blue-600 active:bg-ion-blue-700',
  secondary: 'ix-glass-ambient text-quantum-white border border-quantum-white/12 hover:bg-quantum-white/10 active:bg-quantum-white/14',
  ghost: 'text-quantum-white hover:bg-quantum-white/10 active:bg-quantum-white/14 border border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', glow, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-md font-medium transition-all duration-quick ease-sovereign',
          'focus:outline-none focus:ring-2 focus:ring-ion-blue-500 focus:ring-offset-2 focus:ring-offset-pine-black-900',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          glow && 'ix-glow-primary',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'