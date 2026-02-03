import { Routes, Route } from 'react-router-dom';
import { PanelLayout } from './components/layout/PanelLayout';
import { Sidebar } from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Memory from './pages/Memory';
import Skills from './pages/Skills';
import Agents from './pages/Agents';
import Settings from './pages/Settings';

export default function App() {
  return (
    <PanelLayout sidebar={<Sidebar />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </PanelLayout>
  );
}
