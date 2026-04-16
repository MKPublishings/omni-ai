import React from 'react'

interface AmbientBackgroundProps {
  className?: string
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ className = '' }) => {
  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      <div className="ambient-gradient-field absolute inset-[-18%]" />
      <div className="ambient-gradient-mesh absolute inset-0 opacity-80" />

      <div className="ambient-orb ambient-orb-cyan absolute -left-[12%] top-[-10%] h-[28rem] w-[28rem] rounded-full blur-3xl" />
      <div className="ambient-orb ambient-orb-blue absolute right-[-10%] top-[14%] h-[24rem] w-[24rem] rounded-full blur-3xl" />
      <div className="ambient-orb ambient-orb-amber absolute bottom-[-12%] left-[18%] h-[20rem] w-[20rem] rounded-full blur-3xl" />

      <div className="absolute inset-0 opacity-40">
        <div className="ambient-sheen absolute left-[8%] top-[18%] h-[32rem] w-[32rem] -rotate-12 rounded-full" />
        <div className="ambient-sheen ambient-sheen-delayed absolute right-[6%] top-[42%] h-[26rem] w-[26rem] rotate-[18deg] rounded-full" />
      </div>

      <div className="absolute inset-0">
        {[
          { left: '10%', top: '16%', delay: '0s', duration: '16s' },
          { left: '24%', top: '68%', delay: '2s', duration: '18s' },
          { left: '44%', top: '28%', delay: '4s', duration: '15s' },
          { left: '58%', top: '76%', delay: '1s', duration: '19s' },
          { left: '72%', top: '22%', delay: '3s', duration: '17s' },
          { left: '86%', top: '58%', delay: '5s', duration: '20s' },
        ].map((particle, index) => (
          <div
            key={index}
            className="ambient-particle absolute h-1.5 w-1.5 rounded-full"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>
    </div>
  )
}