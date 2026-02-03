import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export function useApi() {
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/api/sessions')
      return res.data
    },
  })

  const { data: gatewayStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['gateway-status'],
    queryFn: async () => {
      const res = await api.get('/api/gateway/status')
      return res.data
    },
    refetchInterval: 5000,
  })

  return {
    sessions,
    sessionsLoading,
    gatewayStatus,
    statusLoading,
  }
}
