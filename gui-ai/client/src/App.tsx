import { Routes, Route } from 'react-router-dom';
import { PanelLayout } from './components/layout/PanelLayout';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Instances from './pages/Instances';
import Sessions from './pages/Sessions';
import CronJobs from './pages/CronJobs';
import Settings from './pages/Settings';
import { ChatPanelProvider, useChatPanel } from './contexts/ChatPanelContext';
import { ChatSidebarPanel } from './components/layout/ChatSidebarPanel';

function AppContent() {
  const { isChatOpen, closeChat } = useChatPanel();

  return (
    <>
      <PanelLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/instances" element={<Instances />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/cron" element={<CronJobs />} />
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
