import { useState } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Wrench,
  Zap,
  Radio,
  Clock,
} from 'lucide-react';
import { AgentOverview } from './AgentOverview';
import { AgentFiles } from './AgentFiles';
import { AgentTools } from './AgentTools';
import { AgentSkills } from './AgentSkills';
import { AgentChannels } from './AgentChannels';
import { AgentCronJobs } from './AgentCronJobs';
import type { Agent } from '../../lib/gateway-types';

interface AgentDetailProps {
  agent: Agent;
}

type TabId = 'overview' | 'files' | 'tools' | 'skills' | 'channels' | 'cron';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'files', label: 'Files', icon: <FolderOpen className="w-4 h-4" /> },
  { id: 'tools', label: 'Tools', icon: <Wrench className="w-4 h-4" /> },
  { id: 'skills', label: 'Skills', icon: <Zap className="w-4 h-4" /> },
  { id: 'channels', label: 'Channels', icon: <Radio className="w-4 h-4" /> },
  { id: 'cron', label: 'Cron Jobs', icon: <Clock className="w-4 h-4" /> },
];

export function AgentDetail({ agent }: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-terminal-border mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-3 py-2.5 text-sm font-medium
              border-b-2 transition-colors whitespace-nowrap
              ${
                activeTab === tab.id
                  ? 'border-primary-400 text-primary-400'
                  : 'border-transparent text-terminal-text-secondary hover:text-terminal-text hover:border-terminal-border'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <AgentOverview agent={agent} />}
        {activeTab === 'files' && <AgentFiles agent={agent} />}
        {activeTab === 'tools' && <AgentTools agent={agent} />}
        {activeTab === 'skills' && <AgentSkills agent={agent} />}
        {activeTab === 'channels' && <AgentChannels agent={agent} />}
        {activeTab === 'cron' && <AgentCronJobs agent={agent} />}
      </div>
    </div>
  );
}
