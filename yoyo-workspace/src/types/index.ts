export interface Session {
  id: string
  name: string
  createdAt: string
  lastMessageAt: string
  messageCount: number
}

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: string
}

export interface GatewayStatus {
  status: 'online' | 'offline'
  version: string
  uptime: number
}
