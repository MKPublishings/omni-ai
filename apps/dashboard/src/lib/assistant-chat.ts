import { getStoredUser } from './auth'

const CHAT_CACHE_PREFIX = 'ion_assistant_messages:'

export const ASSISTANT_CHAT_CLEARED_EVENT = 'ion-assistant-chat-cleared'

type CachedAssistantMessage = {
  id: string
}

export function getAssistantChatCacheKey() {
  const user = getStoredUser()
  return `${CHAT_CACHE_PREFIX}${user?.id || 'anonymous'}`
}

export function getCachedAssistantMessageCount() {
  if (typeof window === 'undefined') {
    return 0
  }

  try {
    const raw = window.localStorage.getItem(getAssistantChatCacheKey())
    if (!raw) {
      return 0
    }

    const parsed = JSON.parse(raw) as CachedAssistantMessage[]
    if (!Array.isArray(parsed)) {
      return 0
    }

    return parsed.filter((message) => message?.id !== 'welcome').length
  } catch {
    return 0
  }
}

export function clearCachedAssistantMessages() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(getAssistantChatCacheKey())
  window.dispatchEvent(new CustomEvent(ASSISTANT_CHAT_CLEARED_EVENT))
}