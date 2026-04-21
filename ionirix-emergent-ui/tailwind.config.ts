import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ion: {
          blue: '#0A84FF',
          cyan: '#00E5FF',
          white: '#F0F4FF',
          amber: '#FFB800',
          black: '#0D1117',
        },
        surface: {
          0: '#0D1117',
          1: '#161B22',
          2: '#21262D',
          3: '#30363D',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      transitionTimingFunction: {
        emergence: 'cubic-bezier(0.16, 1, 0.3, 1)',
        settle: 'cubic-bezier(0.33, 1, 0.68, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        emerge: 'emerge 800ms cubic-bezier(0.16, 1, 0.3, 1)',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        emerge: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 12px rgba(10, 132, 255, 0.2)' },
          '100%': { boxShadow: '0 0 24px rgba(10, 132, 255, 0.4)' },
        },
      },
    },
  },
  plugins: [forms],
} satisfies Config;