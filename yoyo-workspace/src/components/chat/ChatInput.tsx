import { useState } from 'react'
import { Send, Paperclip } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
}

export default function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="flex items-end gap-2">
      <button
        className="p-3 text-slate-400 hover:text-white transition-colors"
        disabled={disabled}
      >
        <Paperclip size={20} />
      </button>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Connecting...' : 'Type your message...'}
        disabled={disabled}
        className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none max-h-32"
        rows={1}
      />
      
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="p-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        <Send size={20} />
      </button>
    </div>
  )
}
