import { Routes, Route } from 'react-router-dom';
import { PanelLayout } from './components/layout/PanelLayout';
import { Sidebar } from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Instances from './pages/Instances';
import Sessions from './pages/Sessions';
import CronJobs from './pages/CronJobs';
import Chat from './pages/Chat';
import Settings from './pages/Settings';

export default function App() {
  return (
    <PanelLayout sidebar={<Sidebar />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/instances" element={<Instances />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/cron" element={<CronJobs />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </PanelLayout>
  );
}
