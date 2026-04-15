import React from 'react'

interface AmbientBackgroundProps {
  className?: string
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ className = '' }) => {
  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Glass Shimmer Effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45 animate-shimmer" />
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-transparent via-white/3 to-transparent -rotate-12 animate-shimmer-delayed" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-transparent via-white/4 to-transparent rotate-67 animate-shimmer-slow" />
      </div>

      {/* Glow Pulse Effects */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-spectral-cyan-500/10 rounded-full animate-glow-pulse" />
      <div className="absolute bottom-32 right-32 w-40 h-40 bg-ion-blue-500/8 rounded-full animate-glow-pulse-delayed" />
      <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-amber-signal-500/6 rounded-full animate-glow-pulse-slow" />

      {/* Subtle particle-like effects */}
      <div className="absolute inset-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-quantum-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}