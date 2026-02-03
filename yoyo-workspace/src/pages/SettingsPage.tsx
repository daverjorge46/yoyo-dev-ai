import { useState } from 'react'
import { Save, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  const [gatewayUrl, setGatewayUrl] = useState(import.meta.env.VITE_GATEWAY_URL || 'http://localhost:18789')
  const [gatewayToken, setGatewayToken] = useState(import.meta.env.VITE_GATEWAY_TOKEN || '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('yoyo_gateway_url', gatewayUrl)
    localStorage.setItem('yoyo_gateway_token', gatewayToken)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-white mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
          <h2 className="text-lg font-medium text-white mb-4">Gateway Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Gateway URL
              </label>
              <input
                type="text"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="http://localhost:18789"
              />
              <p className="text-xs text-slate-500 mt-1">
                The URL of your OpenClaw gateway
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Gateway Token
              </label>
              <input
                type="password"
                value={gatewayToken}
                onChange={(e) => setGatewayToken(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="your-gateway-token"
              />
              <p className="text-xs text-slate-500 mt-1">
                Authentication token for the gateway
              </p>
            </div>

            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Save size={18} />
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
          <h2 className="text-lg font-medium text-white mb-4">Appearance</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Theme</p>
              <p className="text-sm text-slate-400">Toggle between light and dark mode</p>
            </div>
            <button className="p-2 bg-white/10 rounded-lg text-slate-400">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
          <h2 className="text-lg font-medium text-white mb-2">About</h2>
          <p className="text-slate-400 text-sm">
            YoYoAI Workspace v1.0.0
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Connected to OpenClaw Gateway
          </p>
        </div>
      </div>
    </div>
  )
}
