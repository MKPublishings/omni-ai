import { forwardRef, HTMLAttributes, useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { Input } from './Input'
import { Button } from './Button'
import { ConversationSkeleton } from './Skeleton'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
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
        'max-w-xs lg:max-w-md px-4 py-3 rounded-lg',
        isUser
          ? 'bg-ion-blue-600 text-quantum-white'
          : 'ix-glass-sovereign text-quantum-white'
      )}>
        <p className="text-sm leading-relaxed">{message.content}</p>
        <span className="text-xs opacity-60 mt-2 block">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

const ThinkingIndicator = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="ix-glass-sovereign px-4 py-3 rounded-lg ix-glow-cyan">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-spectral-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-spectral-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-spectral-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
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

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
      scrollToBottom()
    }, [messages, isThinking])

    const handleSend = () => {
      if (inputValue.trim() && onSendMessage) {
        onSendMessage(inputValue.trim())
        setInputValue('')
      }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }

    return (
      <div
        ref={ref}
        className={clsx(
          'ix-glass-sovereign flex flex-col',
          focusMode ? 'fixed inset-4 z-50' : 'h-full',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="p-4 border-b border-quantum-white/8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-spectral-cyan-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-pine-black-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l.707.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-quantum-white">ION AI</h3>
              <p className="text-xs text-quantum-white/64">Cognitive Operating System</p>
            </div>
          </div>
          {onToggleFocus && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFocus}
              className="text-quantum-white/64 hover:text-quantum-white"
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

        {/* Input */}
        <div className="p-4 border-t border-quantum-white/8">
          <div className="flex space-x-3">
            <div className="flex-1">
              <Input
                placeholder="Ask ION AI anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="rounded-full"
                disabled={isThinking}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isThinking}
              className="rounded-full px-4"
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