'use client'
import { useState, useCallback } from 'react'
import type { ChatMessage } from '../lib/types'
import { postQuery } from '../lib/api'

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content: 'Hello! I\'m SolarAI, your intelligent solar plant assistant. I have real-time visibility into all 10 inverters across blocks A, B, and C. Currently 2 inverters are in critical state. How can I help you today?',
  timestamp: new Date(),
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const response = await postQuery(content)
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        supporting_inverters: response.supporting_inverters,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error processing your query. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearChat = useCallback(() => {
    setMessages([GREETING])
  }, [])

  return { messages, isLoading, sendMessage, clearChat }
}
