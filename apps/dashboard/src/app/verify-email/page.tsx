'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/GlassCard'
import { verifyEmailToken } from '@/lib/auth'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('Verifying your email now...')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token') || ''
    if (!token) {
      setStatus('error')
      setMessage('A verification token is required.')
      return
    }

    verifyEmailToken(token)
      .then(() => {
        setStatus('success')
        setMessage('Email verified. You can sign in to the workspace now.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Email verification failed.')
      })
  }, [])

  return (
    <div className="min-h-screen bg-pine-black-900 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <GlassCard className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-quantum-white">Email verification</h1>
          <p className="mt-4 text-sm leading-6 text-quantum-white/72">{message}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex items-center rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">
              {status === 'success' ? 'Sign in' : 'Return to login'}
            </Link>
            <Link href="/" className="inline-flex items-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">
              Public home
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}