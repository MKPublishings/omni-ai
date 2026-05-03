import { forwardRef, HTMLAttributes, useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { CloseCrossIcon, ErrorBadgeIcon, InfoBadgeIcon, SuccessSealIcon, WarningHexIcon } from './icons'

type ToastType = 'info' | 'success' | 'warning' | 'error'

interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  type?: ToastType
  title: string
  message?: string
  duration?: number
  onClose?: () => void
}

const toastStyles: Record<ToastType, { bg: string, border: string, icon: string }> = {
  info: {
    bg: 'bg-spectral-cyan-500/10',
    border: 'border-spectral-cyan-500',
    icon: 'text-spectral-cyan-400'
  },
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500',
    icon: 'text-green-400'
  },
  warning: {
    bg: 'bg-amber-signal-500/10',
    border: 'border-amber-signal-500',
    icon: 'text-amber-signal-400'
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500',
    icon: 'text-red-400'
  }
}

const ToastIcon = ({ type }: { type: ToastType }) => {
  const iconClass = clsx("w-5 h-5", toastStyles[type].icon)

  switch (type) {
    case 'info':
      return <InfoBadgeIcon className={iconClass} />
    case 'success':
      return <SuccessSealIcon className={iconClass} />
    case 'warning':
      return <WarningHexIcon className={iconClass} />
    case 'error':
      return <ErrorBadgeIcon className={iconClass} />
  }
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ type = 'info', title, message, duration = 5000, onClose, className, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(true)
    const [progress, setProgress] = useState(100)

    useEffect(() => {
      if (duration > 0) {
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev <= 0) {
              setIsVisible(false)
              onClose?.()
              return 0
            }
            return prev - (100 / (duration / 100))
          })
        }, 100)

        return () => clearInterval(interval)
      }
    }, [duration, onClose])

    if (!isVisible) return null

    return (
      <div
        ref={ref}
        className={clsx(
          'ix-glass-whisper p-4 rounded-md border-l-4 max-w-sm shadow-3',
          toastStyles[type].bg,
          toastStyles[type].border,
          'transform transition-all duration-quick ease-grok',
          className
        )}
        {...props}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ToastIcon type={type} />
          </div>
          <div className="ml-3 flex-1">
            <h4 className="text-sm font-medium text-quantum-white">
              {title}
            </h4>
            {message && (
              <p className="mt-1 text-sm text-quantum-white/80">
                {message}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => {
                setIsVisible(false)
                onClose?.()
              }}
              className="inline-flex text-quantum-white/40 hover:text-quantum-white transition-colors duration-quick"
            >
                <CloseCrossIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {duration > 0 && (
          <div className="mt-3 h-1 bg-quantum-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-current transition-all duration-100 ease-linear"
              style={{
                width: `${progress}%`,
                backgroundColor: type === 'info' ? '#22d3ee' :
                               type === 'success' ? '#22c55e' :
                               type === 'warning' ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
        )}
      </div>
    )
  }
)

Toast.displayName = 'Toast'