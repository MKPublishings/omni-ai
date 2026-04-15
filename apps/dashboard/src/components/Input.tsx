import { forwardRef, InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          'h-10 px-3 bg-transparent border rounded-md text-quantum-white placeholder-quantum-white/40',
          'transition-all duration-quick ease-sovereign',
          'focus:outline-none focus:ring-2 focus:ring-ion-blue-500',
          error
            ? 'border-amber-signal-500 focus:ring-amber-signal-500'
            : 'border-quantum-white/12 focus:border-ion-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'