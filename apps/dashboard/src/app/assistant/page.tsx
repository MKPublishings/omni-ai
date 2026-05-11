'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardShell } from '@/components/DashboardShell'
import { AIConversationPanel } from '@/components/AIConversationPanel'
import { getApiTargetLabel, getApiUrl, getStoredToken, shouldPreferSameOriginApi } from '@/lib/auth'
import { trackEvent } from '@/lib/analytics'
import { ASSISTANT_CHAT_CLEARED_EVENT, getAssistantChatCacheKey } from '@/lib/assistant-chat'
import { fetchChatHistory } from '@/lib/dashboard'

type ImageMetadata = {
  src: string
  filename?: string
  gateway?: string
  quality?: string
  mode?: string
  styleFamily?: string
  resolution?: string
  ratio?: string
  mimeType?: string
  model?: {
    checkpoint?: string
    outputModel?: string
    sampler?: string
    scheduler?: string
    steps?: number
    cfgScale?: number
    seed?: number
  }
  prompt?: {
    positive?: string
    negative?: string
  }
  pipeline?: {
    requestId?: string
    promptId?: string
    reasoningChain?: string[]
  }
}

type ConversationMessage = {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  sources?: Array<{
    title: string
    url: string
    source: string
  }>
  image?: ImageMetadata
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
      sources?: Array<{
        title: string
        url: string
        source: string
      }>
      image?: ImageMetadata
    }>

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return buildStarterMessages()
    }

    return parsed.map((entry) => ({
      id: entry.id,
      type: entry.type,
      content: entry.content,
      timestamp: new Date(entry.timestamp || Date.now()),
      sources: Array.isArray(entry.sources) ? entry.sources : undefined,
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

function requiresInternetGrounding(message: string) {
  const normalized = String(message || '').trim().toLowerCase()
  if (!normalized) {
    return false
  }

  const livePattern = /\b(today|tonight|tomorrow|current|currently|latest|live|now|right now|recent|news|schedule|games|game|score|scores|standings|odds|price|prices|stock|weather|forecast|traffic|release|released|availability)\b/
  const factualPattern = /\b(who is|who are|what is|what are|when is|when did|where is|where are|which is|which are|how many|how much|find|search|lookup|look up|show me|list|official site|official website|homepage|documentation|docs|guide|reference|compare|vs\.?|benchmark|update)\b/
  const internalPattern = /\b(ion|repo|repository|workspace|dashboard|project|codebase|code|file|component|route|worker|build)\b/

  return livePattern.test(normalized) || factualPattern.test(normalized) || (normalized.endsWith('?') && !internalPattern.test(normalized))
}

function extractAssistantContent(rawText: string) {
  const chunks: string[] = []
  let imageDataUrl = ''
  let imageFilename = ''
  let imageModel = ''
  let imageCheckpoint = ''
  let imageResolution = ''
  let imageGateway = ''
  let sources: AssistantPayload['sources'] = []

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
          checkpoint?: string
          resolution?: string
          gateway?: string
        }
        sources?: Array<{
          title?: string
          url?: string
          source?: string
        }>
      }
      const value = parsed.content || parsed.response || parsed.error
      if (value) {
        chunks.push(value)
      }
      if (!sources.length) {
        sources = normalizeSources(parsed.sources)
      }
      if (!imageDataUrl && parsed.imageDataUrl) {
        imageDataUrl = parsed.imageDataUrl
        imageFilename = parsed.image?.filename || ''
        imageModel = parsed.image?.model || ''
        imageCheckpoint = parsed.image?.checkpoint || ''
        imageResolution = parsed.image?.resolution || ''
        imageGateway = parsed.image?.gateway || ''
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
    imageCheckpoint,
    imageResolution,
    imageGateway,
    sources,
  }
}

function isImagePrompt(message: string) {
  const normalized = String(message || '').trim().toLowerCase()
  return /(^|\s)\/image\b|\b(generate|create|make|draw|render|illustrate|design|craft|show)\b(?:\s+me|\s+us)?(?:\s+an?|\s+some)?[\s\S]{0,60}\b(image|art|picture|photo|poster|illustration|wallpaper|logo|portrait|icon|banner|cover)\b|\bimage of\b|\bpicture of\b|\bmake this into an image\b|\bturn this into an image\b|\bcreate art\b|\bgenerate art\b/.test(normalized)
}

function buildImageSuccessCopy(message: string, filename?: string) {
  const prompt = String(message || '').replace(/^\s*\/image\s*/i, '').trim()
  const normalizedFilename = String(filename || '').trim()
  if (!prompt && !normalizedFilename) {
    return 'Image generated and attached below.'
  }

  if (!prompt) {
    return `Image generated: ${normalizedFilename}`
  }

  if (!normalizedFilename) {
    return `Image ready for: ${prompt}`
  }

  return `Image ready for: ${prompt}\n${normalizedFilename}`
}

function normalizeImageFilename(filename: string) {
  const normalized = String(filename || '').trim().replace(/[\\/:*?"<>|]+/g, '_')
  if (!normalized) {
    return 'ion-image.png'
  }

  if (/^ion[-_]/i.test(normalized)) {
    return normalized
  }

  return `ion-${normalized}`
}

function resolveImageDataUrl(payload: ImageRouteJsonPayload) {
  const fromTopLevel = String(payload.imageDataUrl || '').trim()
  if (fromTopLevel) {
    return fromTopLevel
  }

  const fromNestedImage = String((payload.image as Record<string, unknown> | undefined)?.src || '').trim()
  if (fromNestedImage) {
    return fromNestedImage
  }

  const fromMeta = String((payload.metadata?.image as Record<string, unknown> | undefined)?.src || '').trim()
  return fromMeta
}

type AssistantPayload = {
  ok: boolean
  content: string
  imageDataUrl: string
  imageFilename: string
  imageModel: string
  imageCheckpoint: string
  imageResolution: string
  imageGateway: string
  imageMetadata?: ImageMetadata
  sources: Array<{
    title: string
    url: string
    source: string
  }>
}

type StreamingPayload = {
  content?: string
  response?: string
  error?: string
  sources?: Array<{
    title?: string
    url?: string
    source?: string
  }>
  imageDataUrl?: string
  image?: {
    filename?: string
    model?: string
    checkpoint?: string
    resolution?: string
    gateway?: string
  }
}

type ImageRouteJsonPayload = {
  ok?: boolean
  response?: string
  content?: string
  error?: string
  message?: string
  details?: string
  imageDataUrl?: string
  filename?: string
  image?: {
    filename?: string
    model?: string
    checkpoint?: string
    resolution?: string
    gateway?: string
  }
  metadata?: {
    image?: Record<string, unknown>
    model?: Record<string, unknown>
    pipeline?: Record<string, unknown>
    request?: Record<string, unknown>
    prompt?: Record<string, unknown>
  }
  sources?: Array<{
    title?: string
    url?: string
    source?: string
  }>
}

function normalizeSources(
  sources: StreamingPayload['sources'] | AssistantPayload['sources'] | undefined,
): AssistantPayload['sources'] {
  if (!Array.isArray(sources)) {
    return []
  }

  return sources
    .map((source) => ({
      title: String(source?.title || '').trim(),
      url: String(source?.url || '').trim(),
      source: String(source?.source || '').trim(),
    }))
    .filter((source) => source.title && source.url)
}

function accumulateStreamingPayload(current: AssistantPayload, parsed: StreamingPayload): AssistantPayload {
  const value = parsed.content || parsed.response || parsed.error || ''

  return {
    ok: current.ok,
    content: `${current.content}${value}`,
    imageDataUrl: current.imageDataUrl || parsed.imageDataUrl || '',
    imageFilename: current.imageFilename || parsed.image?.filename || '',
    imageModel: current.imageModel || parsed.image?.model || '',
    imageCheckpoint: current.imageCheckpoint || parsed.image?.checkpoint || '',
    imageResolution: current.imageResolution || parsed.image?.resolution || '',
    imageGateway: current.imageGateway || parsed.image?.gateway || '',
    sources: current.sources.length > 0 ? current.sources : normalizeSources(parsed.sources),
  }
}

function createEmptyAssistantPayload(ok: boolean): AssistantPayload {
  return {
    ok,
    content: '',
    imageDataUrl: '',
    imageFilename: '',
    imageModel: '',
    imageCheckpoint: '',
    imageResolution: '',
    imageGateway: '',
    sources: [],
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
      imageCheckpoint: payload.imageCheckpoint,
      imageResolution: payload.imageResolution,
      imageGateway: payload.imageGateway,
      imageMetadata: {
        src: payload.imageDataUrl,
        filename: payload.imageFilename,
        gateway: payload.imageGateway,
        model: {
          checkpoint: payload.imageCheckpoint,
          outputModel: payload.imageModel,
        },
      },
      sources: payload.sources,
    }
  }

  const payload = await response.json().catch(() => ({})) as ImageRouteJsonPayload
  const meta = payload.metadata
  const metaImage = meta?.image as Record<string, unknown> | undefined
  const metaModel = meta?.model as Record<string, unknown> | undefined
  const metaPipeline = meta?.pipeline as Record<string, unknown> | undefined
  const metaRequest = meta?.request as Record<string, unknown> | undefined
  const metaPrompt = meta?.prompt as Record<string, unknown> | undefined

  function str(v: unknown): string { return typeof v === 'string' ? v : '' }
  function num(v: unknown): number | undefined { return typeof v === 'number' ? v : undefined }
  function strArr(v: unknown): string[] | undefined { return Array.isArray(v) ? v.map(String) : undefined }

  const resolvedImageDataUrl = resolveImageDataUrl(payload)
  const resolvedImageFilename = normalizeImageFilename(str(payload.image?.filename) || str(metaImage?.filename) || str(payload.filename))

  const imageMetadata: ImageMetadata | undefined = meta && resolvedImageDataUrl ? {
    src: resolvedImageDataUrl,
    filename: resolvedImageFilename,
    gateway: str(payload.image?.gateway) || str(metaPipeline?.gateway),
    quality: str(metaRequest?.quality),
    mode: str(metaRequest?.mode),
    styleFamily: str(metaRequest?.styleFamily),
    resolution: str(payload.image?.resolution) || str(metaImage?.resolution),
    ratio: str(metaImage?.ratio),
    mimeType: str(metaImage?.mimeType),
    model: {
      checkpoint: str(payload.image?.checkpoint) || str(metaModel?.checkpoint),
      outputModel: str(payload.image?.model) || str(metaModel?.outputModel),
      sampler: str(metaModel?.sampler),
      scheduler: str(metaModel?.scheduler),
      steps: num(metaModel?.steps),
      cfgScale: num(metaModel?.cfgScale),
      seed: num(metaModel?.seed),
    },
    prompt: {
      positive: str(metaPrompt?.positive),
      negative: str(metaPrompt?.negative),
    },
    pipeline: {
      requestId: str(metaPipeline?.requestId),
      promptId: str(metaPipeline?.promptId),
      reasoningChain: strArr(metaPipeline?.reasoningChain),
    },
  } : undefined

  return {
    ok: response.ok,
    content: response.ok
      ? payload.response || payload.content || ''
      : payload.details || payload.message || payload.error || payload.content || '',
    imageDataUrl: resolvedImageDataUrl,
    imageFilename: resolvedImageFilename,
    imageModel: str(payload.image?.model) || str(metaModel?.outputModel) || str(metaModel?.checkpoint),
    imageCheckpoint: str(payload.image?.checkpoint) || str(metaModel?.checkpoint),
    imageResolution: str(payload.image?.resolution) || str(metaImage?.resolution),
    imageGateway: str(payload.image?.gateway) || str(metaPipeline?.gateway),
    imageMetadata,
    sources: normalizeSources(payload.sources),
  }
}

function AssistantPageContent() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<ConversationMessage[]>(() => readCachedMessages())
  const [isThinking, setIsThinking] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

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

  useEffect(() => {
    if (isLoadingHistory || isThinking) {
      return
    }

    const starter = searchParams.get('starter')
    if (!starter) {
      return
    }

    const alreadyStarted = messages.some((message) => message.type === 'user')
    if (alreadyStarted) {
      return
    }

    const startedKey = `ion-assistant-starter:${starter}`
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(startedKey)) {
      return
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(startedKey, '1')
    }

    void handleSendMessage(starter)
  }, [isLoadingHistory, isThinking, messages, searchParams])

  const handleSendMessage = async (message: string) => {
    const now = Date.now()
    const nonWelcomeCount = messages.filter((entry) => entry.id !== 'welcome').length
    const userMessage: ConversationMessage = {
      id: `${now}`,
      type: 'user',
      content: message,
      timestamp: new Date(),
    }
    const assistantMessageId = `${now}-reply`

    if (nonWelcomeCount === 0) {
      trackEvent('first_message_sent', {
        surface: 'assistant',
      })
    }

    setMessages((current) => [...current, userMessage])
    setIsThinking(true)

    try {
      const token = getStoredToken()
      const imageRequest = isImagePrompt(message)
      const groundedInternetQuery = !imageRequest && requiresInternetGrounding(message)
      const ionPath = shouldPreferSameOriginApi()
        ? groundedInternetQuery ? '/api/ion' : '/api/ion?fast=true'
        : groundedInternetQuery ? '/api/ION' : '/api/ION?fast=true'
      const requestPath = imageRequest ? '/api/image' : ionPath
      const apiTargetLabel = getApiTargetLabel(requestPath)
      const response = await fetch(getApiUrl(requestPath), {
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
                fastMode: !groundedInternetQuery,
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
            sources: streamPayload.sources,
            image: streamPayload.imageMetadata || (streamPayload.imageDataUrl
              ? {
                  src: streamPayload.imageDataUrl,
                  filename: streamPayload.imageFilename,
                  gateway: streamPayload.imageGateway,
                }
              : undefined),
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
          sources: streamed.sources,
          image: streamed.imageMetadata || (streamed.imageDataUrl
            ? {
                src: streamed.imageDataUrl,
                filename: streamed.imageFilename,
                gateway: streamed.imageGateway,
              }
            : undefined),
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
          sources: payload.sources,
          image: payload.imageMetadata || (payload.imageDataUrl
            ? {
                src: payload.imageDataUrl,
                filename: payload.imageFilename,
                gateway: payload.imageGateway,
              }
            : undefined),
        },
      ])
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          type: 'ai',
          content: `ION could not reach ${getApiTargetLabel(isImagePrompt(message) ? '/api/image' : '/api/ION')}. Check NEXT_PUBLIC_ION_API_URL and worker DNS, then try again.`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <DashboardShell
      title=""
      subtitle=""
      hidePageIntroOnMobile
      fullBleedOnMobile
      hideWorkspaceIntentBanner
    >
      <div className="assistant-static-page w-full">
        <AIConversationPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isThinking={isThinking}
          isLoading={isLoadingHistory}
          className="mx-auto h-[calc(100svh-8.5rem)] min-h-[calc(100svh-8.5rem)] w-full max-w-none rounded-none border-x-0 sm:mx-0 sm:min-h-[720px] sm:w-full sm:rounded-[1.5rem] sm:border-x xl:min-h-[calc(100svh-11.5rem)]"
        />
      </div>
    </DashboardShell>
  )
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-pine-black-900 px-[5%] py-4 text-sm text-quantum-white/68 sm:p-4">Loading assistant...</div>}>
      <AssistantPageContent />
    </Suspense>
  )
}