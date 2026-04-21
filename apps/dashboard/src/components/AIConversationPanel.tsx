import { forwardRef, HTMLAttributes, useState, useRef, useEffect, useImperativeHandle } from 'react'
import { clsx } from 'clsx'
import { Button } from './Button'
import { ConversationSkeleton } from './Skeleton'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  sources?: Array<{
    title: string
    url: string
    source: string
  }>
  image?: {
    src: string
    filename?: string
    model?: string
  }
}

interface AIConversationPanelProps extends HTMLAttributes<HTMLDivElement> {
  messages?: Message[]
  onSendMessage?: (message: string) => void
  isThinking?: boolean
  isLoading?: boolean
}

type MessageSegment =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; language: string }

function getSourceLabel(source: string) {
  const normalized = String(source || '').trim().toLowerCase()

  if (normalized === 'open-meteo') return 'weather'
  if (normalized === 'yahoo-finance') return 'market'
  if (normalized === 'espn') return 'sports'
  if (normalized === 'wikipedia') return 'reference'
  if (normalized === 'duckduckgo') return 'web'
  return normalized || 'source'
}

function getSourceFavicon(url: string) {
  const value = String(url || '').trim()
  if (!value) {
    return ''
  }

  try {
    const parsed = new URL(value)
    return `${parsed.origin}/favicon.ico`
  } catch {
    return ''
  }
}

function SourceChip({ source }: { source: NonNullable<Message['sources']>[number] }) {
  const [showFavicon, setShowFavicon] = useState(Boolean(getSourceFavicon(source.url)))
  const faviconUrl = getSourceFavicon(source.url)
  const sourceLabel = getSourceLabel(source.source)

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="chat-source-chip inline-flex max-w-full items-center gap-2 rounded-full border border-quantum-white/12 bg-quantum-white/5 px-3 py-1.5 text-xs text-quantum-white/84 transition hover:bg-quantum-white/10"
      title={source.title}
    >
      {showFavicon && faviconUrl ? (
        <img
          src={faviconUrl}
          alt=""
          className="h-3.5 w-3.5 rounded-sm object-contain"
          onError={() => setShowFavicon(false)}
        />
      ) : null}
      <span className="chat-source-label shrink-0 uppercase tracking-[0.16em] text-quantum-white/48">{sourceLabel}</span>
      <span className="truncate">{source.title}</span>
    </a>
  )
}

function parseMessageSegments(content: string): MessageSegment[] {
  const source = String(content || '').replace(/\r\n/g, '\n')
  if (!source.trim()) {
    return []
  }

  const segments: MessageSegment[] = []
  const fencePattern = /```([\w.+-]*)\n([\s\S]*?)```/g
  let lastIndex = 0

  let match = fencePattern.exec(source)
  while (match) {
    const index = match.index ?? 0
    const [fullMatch, language, code] = match
    const preceding = source.slice(lastIndex, index)
    if (preceding.trim()) {
      segments.push({ type: 'text', content: preceding.trim() })
    }

    segments.push({
      type: 'code',
      content: String(code || '').replace(/\n$/, ''),
      language: String(language || 'text').trim() || 'text',
    })
    lastIndex = index + fullMatch.length
    match = fencePattern.exec(source)
  }

  const trailing = source.slice(lastIndex)
  if (trailing.trim()) {
    segments.push({ type: 'text', content: trailing.trim() })
  }

  return segments.length > 0 ? segments : [{ type: 'text', content: source.trim() }]
}

function looksPreformattedText(content: string) {
  const value = String(content || '')
  const lines = value.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length < 2) {
    return false
  }

  return /(^|\n)\s{2,}\S|[┌┐└┘│─├┤┬┴┼█▁▂▃▄▅▆▇]/.test(value) || lines.filter((line) => /\|/.test(line)).length >= 2
}

function renderMessageText(content: string) {
  const segments = parseMessageSegments(content)

  return segments.map((segment, index) => {
    if (segment.type === 'code') {
      return (
        <div key={`code-${index}`} className="chat-code-block overflow-hidden rounded-2xl border border-quantum-white/12 bg-pine-black-900/70">
          <div className="chat-code-language border-b border-quantum-white/8 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-quantum-white/48">
            {segment.language}
          </div>
          <pre className="chat-code-content chat-selectable overflow-x-auto px-3 py-3 text-[12px] leading-6 text-spectral-cyan-300 sm:px-4 sm:text-[13px]"><code>{segment.content}</code></pre>
        </div>
      )
    }

    if (looksPreformattedText(segment.content)) {
      return (
        <pre key={`text-${index}`} className="chat-preformatted-text chat-selectable overflow-x-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-quantum-white sm:text-[13px]">
          {segment.content}
        </pre>
      )
    }

    return (
      <div key={`text-${index}`} className="chat-rich-text chat-selectable whitespace-pre-wrap break-words text-sm leading-6 text-quantum-white sm:text-[0.95rem] sm:leading-7">
        {segment.content}
      </div>
    )
  })
}

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.type === 'user'
  const renderedSegments = message.content ? renderMessageText(message.content) : []
  const sources = Array.isArray(message.sources) ? message.sources : []

  return (
    <div className={clsx(
      'flex mb-4',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={clsx(
        'chat-message-bubble chat-copy-surface chat-selectable max-w-[94%] break-words rounded-2xl px-3.5 py-2.5 sm:max-w-[85%] sm:px-4 sm:py-3 lg:max-w-[44rem]',
        isUser
          ? 'chat-message-user bg-ion-blue-600 text-quantum-white'
          : 'chat-message-assistant ix-glass-sovereign text-quantum-white'
      )}>
        {renderedSegments.length > 0 ? <div className="space-y-3">{renderedSegments}</div> : null}
        {message.image ? (
          <div className={clsx(message.content ? 'mt-3' : '')}>
            <img
              src={message.image.src}
              alt={message.image.filename || 'Generated image'}
              className="max-h-[28rem] w-full rounded-2xl border border-quantum-white/10 object-cover"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs opacity-70">
              {message.image.filename ? <span>{message.image.filename}</span> : null}
              {message.image.model ? <span>{message.image.model}</span> : null}
              <a
                href={message.image.src}
                download={message.image.filename || 'ion-image.png'}
                className="chat-inline-action inline-flex items-center justify-center rounded-full border border-quantum-white/14 px-3 py-1.5 text-quantum-white transition hover:bg-quantum-white/8"
              >
                Download image
              </a>
            </div>
          </div>
        ) : null}
        {!isUser && sources.length > 0 ? (
          <div className={clsx(message.content || message.image ? 'mt-3' : '')}>
            <div className="chat-sources-heading mb-2 text-[11px] uppercase tracking-[0.2em] text-quantum-white/48">
              Sources
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <SourceChip key={`${source.url}-${source.title}`} source={source} />
              ))}
            </div>
          </div>
        ) : null}
        <span className="chat-message-timestamp mt-2 block select-none text-xs opacity-60">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

const ThinkingIndicator = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="chat-thinking-bubble ix-glass-sovereign rounded-lg px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="h-2 w-2 rounded-full bg-spectral-cyan-400"></div>
            <div className="h-2 w-2 rounded-full bg-spectral-cyan-400"></div>
            <div className="h-2 w-2 rounded-full bg-spectral-cyan-400"></div>
          </div>
          <span className="chat-thinking-label text-sm font-medium uppercase tracking-wider text-spectral-cyan-400">
            Processing
          </span>
        </div>
      </div>
    </div>
  )
}

export const AIConversationPanel = forwardRef<HTMLDivElement, AIConversationPanelProps>(
  ({ messages = [], onSendMessage, isThinking, isLoading, className, ...props }, ref) => {
    const [inputValue, setInputValue] = useState('')
    const [isNativeFullscreen, setIsNativeFullscreen] = useState(false)
    const [isOverlayFullscreen, setIsOverlayFullscreen] = useState(false)
    const [canNativeFullscreen, setCanNativeFullscreen] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const isFullscreen = isNativeFullscreen || isOverlayFullscreen

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView()
    }

    useEffect(() => {
      scrollToBottom()
    }, [messages, isThinking])

    useImperativeHandle(ref, () => panelRef.current!, [])

    useEffect(() => {
      const panel = panelRef.current
      if (!panel || typeof document === 'undefined') {
        return
      }

      setCanNativeFullscreen(typeof panel.requestFullscreen === 'function' && document.fullscreenEnabled !== false)

      const syncFullscreenState = () => {
        const active = document.fullscreenElement === panel
        setIsNativeFullscreen(active)
        if (active) {
          setIsOverlayFullscreen(false)
        }
      }

      syncFullscreenState()
      document.addEventListener('fullscreenchange', syncFullscreenState)

      return () => {
        document.removeEventListener('fullscreenchange', syncFullscreenState)
      }
    }, [])

    useEffect(() => {
      if (typeof document === 'undefined') {
        return
      }

      const { body } = document
      const previousOverflow = body.style.overflow

      if (isOverlayFullscreen) {
        body.style.overflow = 'hidden'
      }

      return () => {
        body.style.overflow = previousOverflow
      }
    }, [isOverlayFullscreen])

    useEffect(() => {
      if (typeof document === 'undefined') {
        return
      }

      const updateSelectionState = () => {
        const selection = window.getSelection()
        const panel = panelRef.current
        const scroller = messagesContainerRef.current
        if (!panel || !scroller) {
          return
        }

        const anchorNode = selection?.anchorNode
        const focusNode = selection?.focusNode
        const hasSelectedText = Boolean(selection && !selection.isCollapsed && selection.toString().trim())
        const isInsidePanel = Boolean(
          hasSelectedText &&
          anchorNode &&
          focusNode &&
          panel.contains(anchorNode) &&
          panel.contains(focusNode)
        )

        scroller.classList.toggle('chat-selection-active', isInsidePanel)
      }

      document.addEventListener('selectionchange', updateSelectionState)
      document.addEventListener('touchend', updateSelectionState, { passive: true })

      return () => {
        document.removeEventListener('selectionchange', updateSelectionState)
        document.removeEventListener('touchend', updateSelectionState)
      }
    }, [])

    const handleSend = () => {
      if (inputValue.trim() && onSendMessage) {
        onSendMessage(inputValue.trim())
        setInputValue('')
      }
    }

    const dismissKeyboard = () => {
      textareaRef.current?.blur()
    }

    const handleScrollToTop = () => {
      messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

      const pageScroller = panelRef.current?.closest('main')
      if (pageScroller instanceof HTMLElement) {
        pageScroller.scrollTo({ top: 0, behavior: 'smooth' })
      }

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()

        if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
          dismissKeyboard()
          return
        }

        handleSend()
      }
    }

    const handleInputFocus = () => {
      if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) {
        return
      }

      window.setTimeout(() => {
        textareaRef.current?.scrollIntoView({ block: 'center' })
      }, 250)
    }

    const handleToggleFullscreen = async () => {
      const panel = panelRef.current
      if (!panel || typeof document === 'undefined') {
        return
      }

      try {
        if (document.fullscreenElement === panel) {
          await document.exitFullscreen()
          return
        }

        if (canNativeFullscreen && typeof panel.requestFullscreen === 'function') {
          await panel.requestFullscreen()
          return
        }

        setIsOverlayFullscreen((value) => !value)
      } catch {
        return
      }
    }

    return (
      <div
        ref={panelRef}
        className={clsx(
          'chat-fullscreen-shell flex h-full w-full min-w-0 flex-col',
          isOverlayFullscreen && 'chat-overlay-fullscreen fixed inset-0 z-50 p-[5vw] sm:p-[5vw]',
          className,
          isFullscreen && '!m-0 left-0 right-0 w-full max-w-none !translate-x-0'
        )}
        {...props}
      >
        <div className={clsx('chat-fullscreen-panel ix-glass-sovereign flex h-full min-h-[30rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] sm:min-h-[40rem] sm:rounded-[1.5rem]', isOverlayFullscreen && 'min-h-0 rounded-[1.25rem] sm:rounded-[1.5rem]')}>
          <div className="chat-panel-header flex items-center justify-between border-b border-quantum-white/8 p-3 sm:p-4 lg:p-5">
            <div className="flex min-w-0 items-center space-x-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-spectral-cyan-500 sm:h-8 sm:w-8">
                <svg className="w-4 h-4 text-pine-black-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l.707.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="chat-app-title text-sm font-semibold text-quantum-white sm:text-lg">ION AI</h3>
                <p className="chat-app-subtitle text-[11px] text-quantum-white/64 sm:text-xs">Cognitive Operating System</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleFullscreen}
              className="chat-icon-button h-9 gap-2 rounded-full px-3 text-quantum-white/72 sm:h-10"
              aria-label={isFullscreen ? 'Exit fullscreen chat' : 'Open fullscreen chat'}
              title={isFullscreen ? 'Exit fullscreen chat' : 'Open fullscreen chat'}
            >
              {isFullscreen ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3H5a2 2 0 00-2 2v3m16-5h-3m3 0v3M8 21H5a2 2 0 01-2-2v-3m16 5h-3a2 2 0 01-2-2v-3m5-8V5a2 2 0 00-2-2h-3M8 16v3a2 2 0 01-2 2H5" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3H5a2 2 0 00-2 2v3m0 8v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3m0-8V5a2 2 0 00-2-2h-3" />
                </svg>
              )}
              <span className="hidden text-xs font-medium uppercase tracking-[0.18em] sm:inline">
                {isFullscreen ? 'Exit' : 'Fullscreen'}
              </span>
            </Button>
          </div>

          <div ref={messagesContainerRef} className="chat-messages-scroll flex-1 overflow-y-auto px-2.5 py-3 sm:px-4 sm:py-5">
            {isLoading && messages.length === 0 ? (
              <ConversationSkeleton />
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isThinking && <ThinkingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-panel-footer border-t border-quantum-white/8 p-2.5 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  placeholder="Ask ION AI anything..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onFocus={handleInputFocus}
                  rows={2}
                  enterKeyHint="done"
                  className="chat-input-field chat-selectable min-h-[48px] w-full resize-none rounded-2xl border border-quantum-white/12 bg-transparent px-4 py-3 text-[16px] leading-6 text-quantum-white placeholder-quantum-white/40 focus:outline-none focus:ring-2 focus:ring-ion-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:leading-5"
                  disabled={isThinking}
                />
              </div>
              <div className="flex w-full gap-2 sm:w-auto sm:flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleScrollToTop}
                  className="chat-icon-button h-11 flex-1 rounded-2xl px-4 text-quantum-white/72 sm:w-11 sm:flex-none sm:px-0"
                  aria-label="Scroll to top"
                  title="Scroll to top"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isThinking}
                  className="h-11 flex-1 rounded-2xl px-5 sm:w-11 sm:flex-none sm:px-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

AIConversationPanel.displayName = 'AIConversationPanel'