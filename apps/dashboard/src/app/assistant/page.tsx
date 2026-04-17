'use client'

import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { AIConversationPanel } from '@/components/AIConversationPanel'
import { getApiUrl, getStoredToken } from '@/lib/auth'
import { ASSISTANT_CHAT_CLEARED_EVENT, getAssistantChatCacheKey } from '@/lib/assistant-chat'
import { fetchChatHistory } from '@/lib/dashboard'

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
    content: 'ION AI online. Standing by for an input.',
    timestamp: new Date(),
  },
]

function buildStarterMessages(): ConversationMessage[] {
  return [
    {
      id: 'welcome',
      type: 'ai',
      content: 'ION AI online. Standing by for an input.',
      timestamp: new Date(),
    },
  ]
}

function getChatCacheKey() {
  return getAssistantChatCacheKey()
}

function readCachedMessages(): ConversationMessage[] {
  if (typeof window === 'undefined') {
    return buildStarterMessages()
  }

  try {
    const raw = window.localStorage.getItem(getChatCacheKey())
    if (!raw) {
      return buildStarterMessages()
    }

    const parsed = JSON.parse(raw) as Array<{
      id: string
      type: 'user' | 'ai'
      content: string
      timestamp: string
      image?: {
        src: string
        filename?: string
        model?: string
      }
    }>

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return buildStarterMessages()
    }

    return parsed.map((entry) => ({
      id: entry.id,
      type: entry.type,
      content: entry.content,
      timestamp: new Date(entry.timestamp || Date.now()),
      image: entry.image,
    }))
  } catch {
    return buildStarterMessages()
  }
}

function writeCachedMessages(messages: ConversationMessage[]) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const serializable = messages.map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    }))
    window.localStorage.setItem(getChatCacheKey(), JSON.stringify(serializable))
  } catch {
    return
  }
}

function mapStoredTurnsToMessages(turns: Array<{
  id: number
  userText: string
  assistantText: string
  createdAt: string
}>): ConversationMessage[] {
  const messages = turns.flatMap((turn) => {
    const timestamp = new Date(turn.createdAt || Date.now())
    return [
      {
        id: `history-user-${turn.id}`,
        type: 'user' as const,
        content: turn.userText,
        timestamp,
      },
      {
        id: `history-ai-${turn.id}`,
        type: 'ai' as const,
        content: turn.assistantText,
        timestamp,
      },
    ]
  })

  return messages.length > 0 ? messages : buildStarterMessages()
}

function buildChatMessages(messages: ConversationMessage[], latestMessage: string) {
  const history = [...messages, {
    id: `pending-${Date.now()}`,
    type: 'user' as const,
    content: latestMessage,
    timestamp: new Date(),
  }]

  return history
    .filter((entry) => entry.id !== 'welcome')
    .slice(-14)
    .map((entry) => ({
      role: entry.type === 'user' ? 'user' : 'assistant',
      content: entry.content,
    }))
}

function inferRequestedOutput(message: string) {
  const normalized = String(message || '').trim().toLowerCase()
  if (!normalized) {
    return 'adaptive'
  }

  if (/\b(json|yaml|xml|csv)\b/.test(normalized)) return 'structured data'
  if (/\b(code|script|snippet|function|component|tsx|typescript|javascript|python|sql|regex|bash|powershell|shell)\b/.test(normalized)) return 'code block'
  if (/\b(table|matrix|tabular|columns)\b/.test(normalized)) return 'table'
  if (/\b(bullet|bullets|list|checklist|steps|outline)\b/.test(normalized)) return 'bullet list'
  if (/\b(annotation|annotate|annotations)\b/.test(normalized)) return 'annotated notes'
  if (/\b(quote|quotes|excerpt|excerpts)\b/.test(normalized)) return 'quoted excerpt'
  if (/\b(graph|chart|diagram|ascii|text visual|text graph|text chart)\b/.test(normalized)) return 'text visual'
  return 'adaptive'
}

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
  return /(^|\s)\/image\b|\b(generate|create|make|draw|render|illustrate|design|craft|show)\b(?:\s+me|\s+us)?(?:\s+an?|\s+some)?[\s\S]{0,60}\b(image|art|picture|photo|poster|illustration|wallpaper|logo|portrait|icon|banner|cover)\b|\bimage of\b|\bpicture of\b|\bmake this into an image\b|\bturn this into an image\b|\bcreate art\b|\bgenerate art\b/.test(normalized)
}

function buildImageSuccessCopy(message: string, filename?: string) {
  void message
  void filename
  return ''
}

type AssistantPayload = {
  ok: boolean
  content: string
  imageDataUrl: string
  imageFilename: string
  imageModel: string
}

type StreamingPayload = {
  content?: string
  response?: string
  error?: string
  imageDataUrl?: string
  image?: {
    filename?: string
    model?: string
  }
}

function accumulateStreamingPayload(current: AssistantPayload, parsed: StreamingPayload): AssistantPayload {
  const value = parsed.content || parsed.response || parsed.error || ''

  return {
    ok: current.ok,
    content: `${current.content}${value}`,
    imageDataUrl: current.imageDataUrl || parsed.imageDataUrl || '',
    imageFilename: current.imageFilename || parsed.image?.filename || '',
    imageModel: current.imageModel || parsed.image?.model || '',
  }
}

function createEmptyAssistantPayload(ok: boolean): AssistantPayload {
  return {
    ok,
    content: '',
    imageDataUrl: '',
    imageFilename: '',
    imageModel: '',
  }
}

async function streamAssistantResponse(
  response: Response,
  onProgress: (payload: AssistantPayload) => void,
): Promise<AssistantPayload> {
  const stream = response.body
  if (!stream) {
    return createEmptyAssistantPayload(response.ok)
  }

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let payload = createEmptyAssistantPayload(response.ok)

  const applyEventData = (rawEvent: string) => {
    const eventData = rawEvent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('')

    if (!eventData || eventData === '[DONE]') {
      return
    }

    try {
      const parsed = JSON.parse(eventData) as StreamingPayload
      payload = accumulateStreamingPayload(payload, parsed)
    } catch {
      payload = {
        ...payload,
        content: `${payload.content}${eventData}`,
      }
    }

    onProgress(payload)
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''

    for (const event of events) {
      applyEventData(event)
    }
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    applyEventData(buffer)
  }

  return payload
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
  const [messages, setMessages] = useState<ConversationMessage[]>(() => readCachedMessages())
  const [isThinking, setIsThinking] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [focusMode, setFocusMode] = useState(false)

  const upsertAssistantMessage = (id: string, patch: Partial<ConversationMessage>) => {
    setMessages((current) => {
      const exists = current.some((message) => message.id === id)
      if (!exists) {
        return [
          ...current,
          {
            id,
            type: 'ai',
            content: '',
            timestamp: new Date(),
            ...patch,
          },
        ]
      }

      return current.map((message) =>
        message.id === id
          ? {
              ...message,
              ...patch,
            }
          : message,
      )
    })
  }

  useEffect(() => {
    writeCachedMessages(messages)
  }, [messages])

  useEffect(() => {
    const handleChatCleared = () => {
      setMessages(buildStarterMessages())
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === getAssistantChatCacheKey() && event.newValue === null) {
        setMessages(buildStarterMessages())
      }
    }

    window.addEventListener(ASSISTANT_CHAT_CLEARED_EVENT, handleChatCleared)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(ASSISTANT_CHAT_CLEARED_EVENT, handleChatCleared)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      const cachedMessages = readCachedMessages()
      if (!cancelled) {
        setMessages(cachedMessages)
      }

      const token = getStoredToken()
      if (!token) {
        if (!cancelled) {
          setIsLoadingHistory(false)
        }
        return
      }

      try {
        const payload = await fetchChatHistory(120)
        if (!cancelled) {
          if (Array.isArray(payload.turns) && payload.turns.length > 0) {
            setMessages(mapStoredTurnsToMessages(payload.turns))
          }
        }
      } catch {
        return
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false)
        }
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSendMessage = async (message: string) => {
    const now = Date.now()
    const userMessage: ConversationMessage = {
      id: `${now}`,
      type: 'user',
      content: message,
      timestamp: new Date(),
    }
    const assistantMessageId = `${now}-reply`

    setMessages((current) => [...current, userMessage])
    setIsThinking(true)

    try {
      const token = getStoredToken()
      const imageRequest = isImagePrompt(message)
      const response = await fetch(getApiUrl(imageRequest ? '/api/image' : '/api/ION?fast=true'), {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
                conversationHints: {
                  requestedOutput: inferRequestedOutput(message),
                },
                messages: buildChatMessages(messages, message),
              }
        ),
      })

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream')) {
        upsertAssistantMessage(assistantMessageId, {
          content: '',
          timestamp: new Date(),
        })
        setIsThinking(false)

        const streamed = await streamAssistantResponse(response, (streamPayload) => {
          const nextContent = streamPayload.ok
            ? streamPayload.imageDataUrl
              ? buildImageSuccessCopy(message, streamPayload.imageFilename)
              : streamPayload.content
            : streamPayload.content || 'The ION runtime rejected the request. Check credentials or deployment health and try again.'

          upsertAssistantMessage(assistantMessageId, {
            content: nextContent,
            timestamp: new Date(),
            image: streamPayload.imageDataUrl
              ? {
                  src: streamPayload.imageDataUrl,
                  filename: streamPayload.imageFilename,
                  model: streamPayload.imageModel,
                }
              : undefined,
          })
        })

        const finalContent = streamed.ok
          ? streamed.imageDataUrl
            ? buildImageSuccessCopy(message, streamed.imageFilename)
            : streamed.content || 'The reasoning engine completed without a formatted response body.'
          : streamed.content || 'The ION runtime rejected the request. Check credentials or deployment health and try again.'

        upsertAssistantMessage(assistantMessageId, {
          content: finalContent,
          timestamp: new Date(),
          image: streamed.imageDataUrl
            ? {
                src: streamed.imageDataUrl,
                filename: streamed.imageFilename,
                model: streamed.imageModel,
              }
            : undefined,
        })

        return
      }

      const payload = await parseAssistantResponse(response)
      const content = payload.ok
        ? payload.imageDataUrl
          ? buildImageSuccessCopy(message, payload.imageFilename)
          : payload.content || 'The reasoning engine completed without a formatted response body.'
        : payload.content || 'The ION runtime rejected the request. Check credentials or deployment health and try again.'

      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
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
      fullBleedOnMobile
    >
      <section className="assistant-static-page w-full md:px-0">
        <div className="min-h-[calc(100svh-8.5rem)] w-full sm:min-h-[680px] xl:min-h-[calc(100svh-12rem)]">
          <AIConversationPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isThinking={isThinking}
            isLoading={isLoadingHistory}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((value) => !value)}
            className="h-full min-h-[calc(100svh-8.5rem)] w-full rounded-none border-x-0 sm:min-h-[680px] sm:rounded-[1.5rem] sm:border-x xl:min-h-[calc(100svh-12rem)]"
          />
        </div>
      </section>
    </DashboardShell>
  )
}