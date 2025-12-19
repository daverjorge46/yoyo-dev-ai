import { Routes, Route, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Specs from './pages/Specs';
import Fixes from './pages/Fixes';
import Tasks from './pages/Tasks';
import Memory from './pages/Memory';
import Skills from './pages/Skills';
import { ConnectionStatus } from './components/ConnectionStatus';
import { useWebSocketContext } from './contexts/WebSocketContext';

// API client
async function fetchStatus() {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

function App() {
  const { status: wsStatus, reconnect } = useWebSocketContext();

  const { data: status, isLoading } = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
    // Reduce polling since WebSocket handles real-time updates
    refetchInterval: wsStatus === 'connected' ? 30000 : 5000,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/yoyo.svg" alt="Yoyo" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Yoyo Dev
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/specs"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`
                }
              >
                Specs
              </NavLink>
              <NavLink
                to="/fixes"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`
                }
              >
                Fixes
              </NavLink>
              <NavLink
                to="/tasks"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`
                }
              >
                Tasks
              </NavLink>
              <NavLink
                to="/memory"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`
                }
              >
                Memory
              </NavLink>
              <NavLink
                to="/skills"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`
                }
              >
                Skills
              </NavLink>
            </nav>

            {/* Status indicator */}
            <div className="flex items-center gap-4">
              {/* Project status */}
              {!isLoading && !status?.yoyoDevInstalled && (
                <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                  Not initialized
                </span>
              )}
              {/* WebSocket connection status */}
              <ConnectionStatus status={wsStatus} onReconnect={reconnect} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/specs" element={<Specs />} />
          <Route path="/fixes" element={<Fixes />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/skills" element={<Skills />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
