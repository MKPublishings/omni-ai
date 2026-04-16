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
  image?: {
    src: string
    filename?: string
    model?: string
  }
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
  let imageDataUrl = ''
  let imageFilename = ''
  let imageModel = ''

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
        imageDataUrl?: string
        image?: {
          filename?: string
          model?: string
        }
      }
      const value = parsed.content || parsed.response || parsed.error
      if (value) {
        chunks.push(value)
      }
      if (!imageDataUrl && parsed.imageDataUrl) {
        imageDataUrl = parsed.imageDataUrl
        imageFilename = parsed.image?.filename || ''
        imageModel = parsed.image?.model || ''
      }
    } catch {
      chunks.push(payload)
    }
  }

  return {
    content: chunks.join('').trim(),
    imageDataUrl,
    imageFilename,
    imageModel,
  }
}

function isImagePrompt(message: string) {
  const normalized = String(message || '').trim().toLowerCase()
  return /(^|\s)\/image\b|\b(generate|create|make|draw|render|illustrate|design)\b[\s\S]{0,40}\b(image|art|picture|photo|poster|illustration|wallpaper|logo)\b|\bimage of\b|\bpicture of\b/.test(normalized)
}

async function parseAssistantResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('text/event-stream')) {
    const rawText = await response.text()
    const payload = extractAssistantContent(rawText)

    return {
      ok: response.ok,
      content: payload.content,
      imageDataUrl: payload.imageDataUrl,
      imageFilename: payload.imageFilename,
      imageModel: payload.imageModel,
    }
  }

  const payload = await response.json().catch(() => ({}))
  return {
    ok: response.ok,
    content: response.ok
      ? payload.response || payload.content || ''
      : payload.error || '',
    imageDataUrl: payload.imageDataUrl || '',
    imageFilename: payload.image?.filename || payload.filename || '',
    imageModel: payload.image?.model || payload.metadata?.model || '',
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
      const token = getStoredToken()
      const imageRequest = isImagePrompt(message)
      const response = await fetch(getApiUrl(imageRequest ? '/api/image' : '/api/ION?fast=true'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          imageRequest
            ? {
                prompt: message.replace(/^\s*\/image\s*/i, '').trim() || message,
                mode: 'simple',
                quality: 'ultra',
              }
            : {
                mode: 'auto',
                fastMode: true,
                messages: [
                  {
                    role: 'user',
                    content: `${message}\n\nContext: ION AI assistant dashboard page. Respond as an operator-facing assistant. If the user asks for an image, generate it instead of only describing it.`,
                  },
                ],
              }
        ),
      })

      const payload = await parseAssistantResponse(response)
      const content = payload.ok
        ? payload.content || (payload.imageDataUrl ? 'Image generated.' : 'The reasoning engine completed without a formatted response body.')
        : payload.content || 'The ION runtime rejected the request. Check credentials or deployment health and try again.'

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-reply`,
          type: 'ai',
          content,
          timestamp: new Date(),
          image: payload.imageDataUrl
            ? {
                src: payload.imageDataUrl,
                filename: payload.imageFilename,
                model: payload.imageModel,
              }
            : undefined,
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
      subtitle=""
      hidePageIntroOnMobile
    >
      <section>
        <div className="min-h-[calc(100svh-10.5rem)] sm:min-h-[680px] xl:min-h-[calc(100svh-12rem)]">
          <AIConversationPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isThinking={isThinking}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((value) => !value)}
            className="h-full min-h-[calc(100svh-10.5rem)] sm:min-h-[680px] xl:min-h-[calc(100svh-12rem)]"
          />
        </div>
      </section>
    </DashboardShell>
  )
}