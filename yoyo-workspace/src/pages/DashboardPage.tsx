import { useQuery } from '@tanstack/react-query'
import { MessageSquare, Zap, Activity, Server } from 'lucide-react'
import { api } from '../services/api'

export default function DashboardPage() {
  const { data: gatewayStatus } = useQuery({
    queryKey: ['gateway-status'],
    queryFn: async () => {
      const res = await api.get('/api/gateway/status')
      return res.data
    },
    refetchInterval: 5000,
  })

  const stats = [
    { label: 'Active Sessions', value: '0', icon: MessageSquare },
    { label: 'Messages Today', value: '0', icon: Zap },
    { label: 'Gateway Status', value: gatewayStatus?.status || 'Unknown', icon: Server },
    { label: 'AI Status', value: 'Ready', icon: Activity },
  ]

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-2">Welcome to YoYoAI Workspace</h1>
      <p className="text-slate-400 mb-8">Your intelligent assistant powered by OpenClaw</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-6 h-6 text-cyan-400" />
              <span className={`text-sm px-2 py-1 rounded-full ${
                stat.value === 'online' || stat.value === 'Ready' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-slate-500/20 text-slate-400'
              }`}>
                {stat.value}
              </span>
            </div>
            <p className="text-sm text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full p-4 text-left bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
              <p className="font-medium text-white">Start New Chat</p>
              <p className="text-sm text-slate-400">Begin a conversation with YoYo</p>
            </button>
            <button className="w-full p-4 text-left bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
              <p className="font-medium text-white">View Sessions</p>
              <p className="text-sm text-slate-400">Manage your chat history</p>
            </button>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-cyan-500/10 to-purple-600/10 border border-cyan-500/20 rounded-xl">
          <h2 className="text-lg font-semibold text-white mb-2">✨ YoYoAI</h2>
          <p className="text-slate-300 mb-4">
            Your personal AI assistant is ready to help with tasks, answer questions, 
            and automate your workflow.
          </p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-sm rounded-full">Multi-Agent</span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">Real-time</span>
            <span className="px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-full">Connected</span>
          </div>
        </div>
      </div>
    </div>
  )
}
