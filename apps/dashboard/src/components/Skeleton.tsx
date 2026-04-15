import React from 'react'
import { GlassCard } from './GlassCard'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height
}) => {
  const baseClasses = 'animate-pulse bg-quantum-white/10'

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  )
}

interface StatCardSkeletonProps {
  className?: string
}

export const StatCardSkeleton: React.FC<StatCardSkeletonProps> = ({ className = '' }) => {
  return (
    <GlassCard tier={1} className={`p-6 ${className}`}>
      <div className="space-y-4">
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="40%" height={32} />
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton variant="text" width="30%" height={16} />
        </div>
      </div>
    </GlassCard>
  )
}

interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} variant="text" width="100%" height={16} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              variant="text"
              width="100%"
              height={14}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface ConversationSkeletonProps {
  className?: string
}

export const ConversationSkeleton: React.FC<ConversationSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* AI Message */}
      <div className="flex justify-start">
        <div className="max-w-xs lg:max-w-md">
          <Skeleton variant="rectangular" width="100%" height={60} className="mb-2" />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>

      {/* User Message */}
      <div className="flex justify-end">
        <div className="max-w-xs lg:max-w-md">
          <Skeleton variant="rectangular" width="100%" height={40} className="mb-2" />
          <Skeleton variant="text" width="30%" height={12} />
        </div>
      </div>

      {/* AI Thinking Indicator */}
      <div className="flex justify-start">
        <div className="flex space-x-1">
          <Skeleton variant="circular" width={8} height={8} />
          <Skeleton variant="circular" width={8} height={8} />
          <Skeleton variant="circular" width={8} height={8} />
        </div>
      </div>
    </div>
  )
}