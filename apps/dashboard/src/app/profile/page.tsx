'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { AuthUser, resendVerification, updateProfile } from '@/lib/auth'
import { fetchDashboardUser } from '@/lib/dashboard'

function buildVerificationDeliveryNotice(input: {
  sent?: boolean
  error?: string
  fallbackLink?: boolean
}) {
  if (input.sent) {
    return 'Verification email sent.'
  }

  const detail = String(input.error || '').trim()
  if (detail) {
    return `Verification email delivery failed: ${detail}${input.fallbackLink ? ' Use the link below while the mail transport is being fixed.' : ''}`
  }

  return input.fallbackLink
    ? 'Verification email delivery failed. Use the link below while the mail transport is being fixed.'
    : 'Verification email delivery failed.'
}

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [verificationUrl, setVerificationUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchDashboardUser()
      .then((payload) => {
        setUser(payload.user)
        setDisplayName(payload.user.displayName)
        setUsername(payload.user.username)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const nextUser = await updateProfile({ displayName, username })
      setUser(nextUser)
      setSuccess('Profile updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleResendVerification = async () => {
    if (!user?.email) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const payload = await resendVerification(user.email)
      setVerificationUrl(payload.verificationUrl || '')
      setSuccess(
        payload.alreadyVerified
          ? 'Email is already verified.'
          : buildVerificationDeliveryNotice({
              sent: Boolean(payload.verificationEmailSent),
              error: payload.verificationEmailError,
              fallbackLink: Boolean(payload.verificationUrl),
            })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification')
    }
  }

  return (
    <DashboardShell
      title="Profile"
      subtitle="Edit your identity details, review verification state, and keep account settings aligned with the broader workspace configuration."
    >
      {error && <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">{error}</GlassCard>}
      {success && <GlassCard tier={2} className="p-4 text-sm text-spectral-cyan-300">{success}</GlassCard>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Identity editor</h2>
          <form className="mt-5 space-y-4" onSubmit={handleSave}>
            <div>
              <label className="mb-2 block text-sm text-quantum-white/64">Display name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-11 w-full rounded-xl" disabled={loading || saving} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-quantum-white/64">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="h-11 w-full rounded-xl" disabled={loading || saving} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-quantum-white/64">Email</label>
              <Input value={user?.email || ''} className="h-11 w-full rounded-xl" disabled />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={loading || saving} className="min-h-[2.75rem] flex-1 rounded-full sm:min-h-0 sm:flex-none">{saving ? 'Saving...' : 'Save profile'}</Button>
              <Link href="/settings" className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8 sm:min-h-0 sm:flex-none">Open settings</Link>
              <Link href="/billing/manage" className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8 sm:min-h-0 sm:flex-none">Open billing</Link>
            </div>
          </form>
        </GlassCard>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
          <GlassCard tier={2} className="p-6">
            <h2 className="text-xl font-semibold text-quantum-white">Verification state</h2>
            <p className="mt-3 text-sm leading-6 text-quantum-white/72">
              {user?.emailVerified ? 'This account is verified and can access the workspace normally.' : 'This account still needs email verification before it can complete a new sign-in.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex min-h-[2.75rem] items-center rounded-full border border-quantum-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-quantum-white/60">
                {user?.emailVerified ? 'Verified' : 'Pending'}
              </span>
              {!user?.emailVerified && (
                <Button variant="secondary" onClick={handleResendVerification} className="min-h-[2.75rem] flex-1 rounded-full sm:min-h-0 sm:flex-none">Send verification email</Button>
              )}
            </div>
            {verificationUrl && (
              <div className="mt-4">
                <Link href={verificationUrl} className="break-all text-sm text-spectral-cyan-300 underline underline-offset-4">Open latest verification link directly</Link>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-quantum-white">Settings handshake</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-quantum-white/72">
              <li>Profile owns editable identity fields.</li>
              <li>Settings summarizes verification and runtime posture.</li>
              <li>Both pages link to each other so the account flow stays coherent on mobile and desktop.</li>
            </ul>
          </GlassCard>
        </div>
      </section>
    </DashboardShell>
  )
}