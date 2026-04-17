import { forwardRef, HTMLAttributes, useState, useRef, useEffect, useImperativeHandle } from 'react'
import { clsx } from 'clsx'
import { Button } from './Button'
import { ConversationSkeleton } from './Skeleton'

interface Message {
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

interface AIConversationPanelProps extends HTMLAttributes<HTMLDivElement> {
  messages?: Message[]
  onSendMessage?: (message: string) => void
  isThinking?: boolean
  isLoading?: boolean
  focusMode?: boolean
  onToggleFocus?: () => void
}

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.type === 'user'

  return (
    <div className={clsx(
      'flex mb-4',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={clsx(
        'chat-copy-surface chat-selectable max-w-[94%] break-words rounded-2xl px-3.5 py-2.5 sm:max-w-[82%] sm:px-4 sm:py-3 lg:max-w-xl',
        isUser
          ? 'bg-ion-blue-600 text-quantum-white'
          : 'ix-glass-sovereign text-quantum-white'
      )}>
        {message.content ? <p className="chat-selectable text-sm leading-6 sm:text-[0.95rem] sm:leading-7">{message.content}</p> : null}
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
                className="inline-flex items-center justify-center rounded-full border border-quantum-white/14 px-3 py-1.5 text-quantum-white transition hover:bg-quantum-white/8"
              >
                Download image
              </a>
            </div>
          </div>
        ) : null}
        <span className="mt-2 block select-none text-xs opacity-60">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

const ThinkingIndicator = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="ix-glass-sovereign px-4 py-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="h-2 w-2 rounded-full bg-spectral-cyan-400"></div>
            <div className="h-2 w-2 rounded-full bg-spectral-cyan-400"></div>
            <div className="h-2 w-2 rounded-full bg-spectral-cyan-400"></div>
          </div>
          <span className="text-spectral-cyan-400 text-sm font-medium uppercase tracking-wider">
            Processing
          </span>
        </div>
      </div>
    </div>
  )
}

export const AIConversationPanel = forwardRef<HTMLDivElement, AIConversationPanelProps>(
  ({ messages = [], onSendMessage, isThinking, isLoading, focusMode, onToggleFocus, className, ...props }, ref) => {
    const [inputValue, setInputValue] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView()
    }

    useEffect(() => {
      scrollToBottom()
    }, [messages, isThinking])

    useImperativeHandle(ref, () => panelRef.current!, [])

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

    return (
      <div
        className={clsx(
          'ix-glass-sovereign flex min-h-[30rem] min-w-0 flex-col overflow-hidden rounded-[1.25rem] sm:min-h-[40rem] sm:rounded-[1.5rem]',
          focusMode ? 'fixed inset-0 z-50 rounded-none sm:inset-4 sm:rounded-[1.5rem]' : 'h-full w-full',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-quantum-white/8 p-3 sm:p-5">
          <div className="flex min-w-0 items-center space-x-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-spectral-cyan-500 sm:h-8 sm:w-8">
              <svg className="w-4 h-4 text-pine-black-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l.707.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-quantum-white sm:text-lg">ION AI</h3>
              <p className="text-[11px] text-quantum-white/64 sm:text-xs">Cognitive Operating System</p>
            </div>
          </div>
          {onToggleFocus && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFocus}
              className="h-9 w-9 rounded-full p-0 text-quantum-white/64 sm:h-8 sm:w-auto sm:rounded-md sm:p-0"
            >
              {focusMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </Button>
          )}
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

        <div className="border-t border-quantum-white/8 p-2.5 sm:p-4">
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
                className="chat-selectable min-h-[48px] w-full resize-none rounded-2xl border border-quantum-white/12 bg-transparent px-4 py-3 text-[16px] leading-6 text-quantum-white placeholder-quantum-white/40 focus:outline-none focus:ring-2 focus:ring-ion-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:leading-5"
                disabled={isThinking}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isThinking}
              className="h-11 w-full rounded-2xl px-5 sm:h-11 sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    )
  }
)

AIConversationPanel.displayName = 'AIConversationPanel'