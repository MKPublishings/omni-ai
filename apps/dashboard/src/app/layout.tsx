import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ionirix',
  description: 'Sovereign Design System for Ionirix LLC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}