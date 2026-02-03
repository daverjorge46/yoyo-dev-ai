import { useRef, useEffect } from 'react'
import { User, Bot } from 'lucide-react'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: string
}

interface ChatMessagesProps {
  messages: Message[]
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <Bot className="w-12 h-12 mb-4 opacity-50" />
          <p>Start a conversation with YoYo</p>
          <p className="text-sm mt-2">Ask me anything or give me a task to help with</p>
        </div>
      )}
      
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            message.role === 'user' 
              ? 'bg-gradient-to-br from-cyan-500 to-cyan-600' 
              : 'bg-gradient-to-br from-purple-500 to-purple-600'
          }`}>
            {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
          </div>
          
          <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
            message.role === 'user'
              ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30'
              : 'bg-white/5 border border-white/10'
          }`}>
            <p className="text-white whitespace-pre-wrap">{message.content}</p>
            <span className="text-xs text-slate-500 mt-1 block">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
