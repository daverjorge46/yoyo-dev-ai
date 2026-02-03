import axios from 'axios'

const getGatewayToken = () => {
  return localStorage.getItem('yoyo_gateway_token') || import.meta.env.VITE_GATEWAY_TOKEN || ''
}

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getGatewayToken()}`,
  },
})

// Update config when settings change
export const updateApiConfig = () => {
  api.defaults.headers.common['Authorization'] = `Bearer ${getGatewayToken()}`
}
