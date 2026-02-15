import { Routes, Route } from 'react-router-dom';
import { PanelLayout } from './components/layout/PanelLayout';
import { TokenGate } from './components/TokenGate';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Channels from './pages/Channels';
import Instances from './pages/Instances';
import Sessions from './pages/Sessions';
import CronJobs from './pages/CronJobs';
import Models from './pages/Models';
import Skills from './pages/Skills';
import Gateway from './pages/Gateway';
import Commands from './pages/Commands';
import Settings from './pages/Settings';
import { ChatPanelProvider, useChatPanel } from './contexts/ChatPanelContext';
import { ChatSidebarPanel } from './components/layout/ChatSidebarPanel';
import { useGateway } from './contexts/GatewayContext';

function AppContent() {
  const { isChatOpen, closeChat } = useChatPanel();
  const { needsToken } = useGateway();

  // Show token input gate when auto-load failed
  if (needsToken) {
    return <TokenGate />;
  }

  return (
    <>
      <PanelLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/instances" element={<Instances />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/cron" element={<CronJobs />} />
          <Route path="/models" element={<Models />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/gateway" element={<Gateway />} />
          <Route path="/commands" element={<Commands />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </PanelLayout>

      {/* Chat Sidebar Panel */}
      <ChatSidebarPanel isOpen={isChatOpen} onClose={closeChat} />
    </>
  );
}

export default function App() {
  return (
    <ChatPanelProvider>
      <AppContent />
    </ChatPanelProvider>
  );
}
