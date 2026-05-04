import type { Metadata } from 'next'
import './globals.css'
import '../ui/billing/billing.css'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { ViewportLayoutController } from '@/components/ViewportLayoutController'

export const metadata: Metadata = {
  title: 'Ionirix',
  description: 'Ion is a sovereign intelligence workspace for operators who need private, persistent, high-context execution.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ViewportLayoutController />
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </body>
    </html>
  )
}