import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Clock } from 'lucide-react'
import { api } from '../services/api'
import { formatDistanceToNow } from 'date-fns'

interface Session {
  id: string
  name: string
  createdAt: string
  lastMessageAt: string
  messageCount: number
}

export default function SessionsPage() {
  const navigate = useNavigate()
  
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/api/sessions')
      return res.data as Session[]
    },
  })

  const createNewSession = async () => {
    try {
      const res = await api.post('/api/sessions', { name: 'New Chat' })
      navigate(`/chat/${res.data.id}`)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Chat Sessions</h1>
        <button
          onClick={createNewSession}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={20} />
          New Session
        </button>
      </div>

      <div className="grid gap-4">
        {sessions?.map((session) => (
          <div
            key={session.id}
            onClick={() => navigate(`/chat/${session.id}`)}
            className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/20 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{session.name}</h3>
                  <p className="text-sm text-slate-400">
                    {session.messageCount} messages
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Clock size={14} />
                {formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}
        
        {(!sessions || sessions.length === 0) && (
          <div className="text-center py-12 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No sessions yet. Create your first chat!</p>
          </div>
        )}
      </div>
    </div>
  )
}
