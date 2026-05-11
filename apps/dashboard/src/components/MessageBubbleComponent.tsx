'use client'

import React, { useState, useEffect } from 'react'
import { clsx } from 'clsx'

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
  }
}

export function MessageBubble({ message }: { message: Message }): React.ReactElement {
  const isUser = message.type === 'user'
  const [showImageModal, setShowImageModal] = useState(false)

  useEffect(() => {
    if (!showImageModal || typeof document === 'undefined') {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowImageModal(false)
      }
    }

    document.addEventListener('keydown', onEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onEscape)
    }
  }, [showImageModal])

  return (
    <div className={clsx('flex mb-4', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'chat-message-bubble max-w-[94%] break-words rounded-2xl px-3.5 py-2.5',
          isUser ? 'bg-ion-blue-600 text-white' : 'bg-gray-700 text-white'
        )}
      >
        <p>{message.content}</p>
        <span className="text-xs opacity-60">{message.timestamp.toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
