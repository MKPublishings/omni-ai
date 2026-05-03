import { forwardRef, HTMLAttributes, useEffect } from 'react'
import { clsx } from 'clsx'
import { Button } from './Button'
import { CloseCrossIcon } from './icons'

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  contentClassName?: string
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ isOpen, onClose, title, size = 'md', className, contentClassName, children, ...props }, ref) => {
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      if (isOpen) {
        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = 'unset'
      }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl'
    }

    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-pine-black-900/72 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          ref={ref}
          className={clsx(
            'relative max-h-[calc(100svh-1rem)] w-full overflow-hidden rounded-[1.25rem] shadow-4 sm:max-h-[calc(100svh-2rem)] sm:rounded-[1.5rem]',
            'ix-glass-sovereign',
            sizeClasses[size],
            className
          )}
          {...props}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between gap-3 border-b border-quantum-white/8 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="min-w-0 text-lg font-semibold text-quantum-white sm:text-xl">
                {title}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 shrink-0 rounded-full p-0 text-quantum-white/64 hover:text-quantum-white"
              >
                <CloseCrossIcon className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Content */}
          <div className={clsx('max-h-[calc(100svh-5.5rem)] overflow-y-auto px-4 py-4 sm:max-h-[calc(100svh-8rem)] sm:px-6 sm:py-6', contentClassName)}>
            {children}
          </div>
        </div>
      </div>
    )
  }
)

Modal.displayName = 'Modal'