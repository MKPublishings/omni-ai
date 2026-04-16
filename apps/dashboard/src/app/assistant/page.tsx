'use client'

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

export default function AssistantPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>(starterMessages)
  const [isThinking, setIsThinking] = useState(false)
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)

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
      const response = await fetch(getApiUrl('/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: 'reasoning.speak',
          mode: 'analysis',
          input: {
            query: message,
            context: 'ION AI assistant dashboard page',
          },
        }),
      })

      const payload = await response.json().catch(() => ({}))
      const content = response.ok
        ? payload.response || 'The reasoning engine completed without a formatted response body.'
        : 'The ION runtime rejected the request. Check credentials or deployment health and try again.'

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
        <div className="min-h-[680px]">
          <AIConversationPanel messages={messages} onSendMessage={handleSendMessage} isThinking={isThinking} className="h-full min-h-[680px]" />
        </div>

        <div className="grid gap-6">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-quantum-white">Assistant context</h2>
            <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
              <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
                <dt>Environment</dt>
                <dd className="font-medium text-quantum-white">{status?.environment.platform || 'Loading'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
                <dt>Status</dt>
                <dd className="font-medium text-quantum-white">{status?.status || 'Loading'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Runtime version</dt>
                <dd className="font-medium text-quantum-white">{status?.version || 'Loading'}</dd>
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
          </GlassCard>
        </div>
      </section>
    </DashboardShell>
  )
}