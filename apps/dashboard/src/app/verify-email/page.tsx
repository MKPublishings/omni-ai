'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { GlassCard } from '@/components/GlassCard'
import { Input } from '@/components/Input'
import { resendVerification, verifyEmailToken } from '@/lib/auth'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'expired' | 'invalid' | 'used' | 'missing' | 'error'>('verifying')
  const [message, setMessage] = useState('Verifying your email now...')
  const [email, setEmail] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token') || ''
    if (!token) {
      setStatus('missing')
      setMessage('A verification token is required.')
      return
    }

    verifyEmailToken(token)
      .then((result) => {
        if (result.ok) {
          setStatus('success')
          setMessage('Email verified. Your Ionirix account is now active.')
          return
        }

        switch (result.code) {
          case 'EMAIL_VERIFICATION_EXPIRED':
            setStatus('expired')
            setMessage(result.error || 'This verification link has expired. Request a fresh verification email to continue.')
            break
          case 'EMAIL_VERIFICATION_USED':
            setStatus('used')
            setMessage(result.error || 'This verification link has already been used. Sign in to continue.')
            break
          case 'EMAIL_VERIFICATION_INVALID':
            setStatus('invalid')
            setMessage(result.error || 'This verification link is invalid.')
            break
          case 'EMAIL_VERIFICATION_MISSING_TOKEN':
            setStatus('missing')
            setMessage(result.error || 'A verification token is required.')
            break
          default:
            setStatus('error')
            setMessage(result.error || 'Email verification failed.')
            break
        }
      })
  }, [])

  const canResend = status === 'expired' || status === 'invalid' || status === 'missing' || status === 'error'

  const handleResend = async () => {
    if (!email.trim()) {
      setResendError('Enter your email or username to resend the verification email.')
      return
    }

    setIsResending(true)
    setResendError('')
    setResendMessage('')

    try {
      const payload = await resendVerification(email.trim())
      setResendMessage(
        payload.alreadyVerified
          ? 'This account is already verified. You can sign in now.'
          : payload.verificationEmailSent
            ? 'A fresh verification email has been sent.'
            : 'A fresh verification link is ready on the login screen.'
      )
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Could not resend verification email.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-pine-black-900 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <GlassCard className="p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-quantum-white/42">Ionirix</p>
          <h1 className="mt-3 text-2xl font-bold text-quantum-white">Email verification</h1>
          <p className="mt-4 text-sm leading-6 text-quantum-white/72">{message}</p>

          {canResend && (
            <div className="mt-6 rounded-2xl border border-quantum-white/10 bg-black/10 p-4">
              <h2 className="text-sm font-semibold text-quantum-white">Resend verification email</h2>
              <p className="mt-2 text-sm leading-6 text-quantum-white/60">Enter the email address or username tied to your Ionirix account and we will issue a fresh verification link.</p>
              <Input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address or username"
                className="mt-4 h-11 w-full rounded-xl"
                disabled={isResending}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" onClick={handleResend} disabled={isResending} className="min-h-[2.75rem] rounded-full px-5">
                  {isResending ? 'Sending...' : 'Resend verification email'}
                </Button>
              </div>
              {resendMessage && <p className="mt-3 text-sm text-spectral-cyan-300">{resendMessage}</p>}
              {resendError && <p className="mt-3 text-sm text-amber-signal-500">{resendError}</p>}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex items-center rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">
              {status === 'success' || status === 'used' ? 'Sign in' : 'Return to login'}
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