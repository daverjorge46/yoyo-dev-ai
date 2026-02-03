import { useEffect, useState } from 'react'
import ChatMessages from '../components/chat/ChatMessages'
import ChatInput from '../components/chat/ChatInput'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAppStore } from '../stores/appStore'

export default function ChatPage() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, isConnected } = useWebSocket()
  const { currentSession } = useAppStore()

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-semibold text-white">Chat with YoYo</h1>
          <p className="text-sm text-slate-400">
            {currentSession ? `Session: ${currentSession.name}` : 'New Session'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-slate-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ChatMessages messages={messages} />
      </div>
      
      <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm">
        <ChatInput 
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={!isConnected}
        />
      </div>
    </div>
  )
}
