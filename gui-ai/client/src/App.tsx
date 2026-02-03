import { Routes, Route } from 'react-router-dom';
import { PanelLayout } from './components/layout/PanelLayout';
import { Sidebar } from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Tasks from './pages/Tasks';
import Automation from './pages/Automation';
import Documents from './pages/Documents';
import Messages from './pages/Messages';
import Connections from './pages/Connections';
import Settings from './pages/Settings';

export default function App() {
  return (
    <PanelLayout sidebar={<Sidebar />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/automation" element={<Automation />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </PanelLayout>
  );
}
