'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { AIConversationPanel } from '@/components/AIConversationPanel'
import { GlassCard } from '@/components/GlassCard'
import { getApiUrl, getStoredToken } from '@/lib/auth'
import { DashboardSystemStatus, fetchSystemStatus } from '@/lib/dashboard'

type ConversationMessage = {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

const starterMessages: ConversationMessage[] = [
  {
    id: 'welcome',
    type: 'ai',
    content: 'ION AI is online. Ask for architecture checks, system reasoning, or operator guidance.',
    timestamp: new Date(),
  },
]

function extractAssistantContent(rawText: string) {
  const chunks: string[] = []

  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) {
      continue
    }

    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') {
      continue
    }

    try {
      const parsed = JSON.parse(payload) as {
        content?: string
        response?: string
        error?: string
      }
      const value = parsed.content || parsed.response || parsed.error
      if (value) {
        chunks.push(value)
      }
    } catch {
      chunks.push(payload)
    }
  }

  return chunks.join('').trim()
}

async function parseAssistantResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('text/event-stream')) {
    const rawText = await response.text()
    const content = extractAssistantContent(rawText)

    return {
      ok: response.ok,
      content,
    }
  }

  const payload = await response.json().catch(() => ({}))
  return {
    ok: response.ok,
    content: response.ok
      ? payload.response || ''
      : payload.error || '',
  }
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>(starterMessages)
  const [isThinking, setIsThinking] = useState(false)
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)
  const [focusMode, setFocusMode] = useState(false)

  useEffect(() => {
    fetchSystemStatus().then(setStatus).catch(() => undefined)
  }, [])

  const handleSendMessage = async (message: string) => {
    const userMessage: ConversationMessage = {
      id: `${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date(),
    }

    setMessages((current) => [...current, userMessage])
    setIsThinking(true)

    try {
      const response = await fetch(getApiUrl('/api/ION?fast=true'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'analysis',
          fastMode: true,
          messages: [
            {
              role: 'user',
              content: `${message}\n\nContext: ION AI assistant dashboard page. Respond as an operator-facing assistant.`,
            },
          ],
        }),
      })

      const payload = await parseAssistantResponse(response)
      const content = payload.ok
        ? payload.content || 'The reasoning engine completed without a formatted response body.'
        : payload.content || 'The ION runtime rejected the request. Check credentials or deployment health and try again.'

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-reply`,
          type: 'ai',
          content,
          timestamp: new Date(),
        },
      ])
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          type: 'ai',
          content: 'The assistant could not reach the live Worker endpoint.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <DashboardShell
      title="Assistant"
      subtitle="A direct interface into ION reasoning, with deployment health and operator prompts visible alongside the conversation."
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="min-h-[560px] sm:min-h-[680px]">
          <AIConversationPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isThinking={isThinking}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((value) => !value)}
            className="h-full min-h-[560px] sm:min-h-[680px]"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-quantum-white">Assistant context</h2>
            <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
              <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt>Environment</dt>
                <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.environment.platform || 'Loading'}</dd>
              </div>
              <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt>Status</dt>
                <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.status || 'Loading'}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt>Runtime version</dt>
                <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.version || 'Loading'}</dd>
              </div>
            </dl>
          </GlassCard>

          <GlassCard tier={2} className="p-6">
            <h2 className="text-xl font-semibold text-quantum-white">Prompt starters</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-quantum-white/72">
              <li>Summarize the current Worker architecture and identify weak spots.</li>
              <li>Explain the latest system events in plain language for an operator.</li>
              <li>Propose the next implementation priorities for dashboard hardening.</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/analytics" className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8 sm:min-h-0 sm:flex-none">Open analytics</Link>
              <Link href="/profile" className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8 sm:min-h-0 sm:flex-none">Edit profile</Link>
            </div>
          </GlassCard>
        </div>
      </section>
    </DashboardShell>
  )
}