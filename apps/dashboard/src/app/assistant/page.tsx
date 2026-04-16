'use client'

import { useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { AIConversationPanel } from '@/components/AIConversationPanel'
import { getApiUrl, getStoredToken } from '@/lib/auth'

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
  const [focusMode, setFocusMode] = useState(false)

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
      hidePageIntroOnMobile
    >
      <section>
        <div className="min-h-[calc(100svh-10.5rem)] sm:min-h-[680px] xl:min-h-[560px]">
          <AIConversationPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isThinking={isThinking}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((value) => !value)}
            className="h-full min-h-[calc(100svh-10.5rem)] sm:min-h-[680px] xl:min-h-[560px]"
          />
        </div>
      </section>
    </DashboardShell>
  )
}