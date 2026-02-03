import { useQuery } from '@tanstack/react-query';
import {
  Bot,
  Search,
  Code,
  FileText,
  Compass,
  Eye,
  Sparkles,
  Activity,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { PageLoader } from '../components/common/LoadingSpinner';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  status: 'available' | 'busy' | 'offline';
  temperature: number;
  specialties: string[];
}

const iconMap: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  eye: Eye,
  search: Search,
  compass: Compass,
  code: Code,
  'file-text': FileText,
  default: Bot,
};

// Yoyo Dev agents
const yoyoAgents: Agent[] = [
  {
    id: 'yoyo-ai',
    name: 'Yoyo AI',
    role: 'Primary Orchestrator',
    description: 'Main AI assistant that coordinates all other agents and handles general requests',
    icon: 'sparkles',
    status: 'available',
    temperature: 1.0,
    specialties: ['Orchestration', 'Planning', 'General Tasks'],
  },
  {
    id: 'arthas-oracle',
    name: 'Arthas Oracle',
    role: 'Strategic Advisor',
    description: 'Provides strategic guidance, debugging assistance, and deep analysis',
    icon: 'eye',
    status: 'available',
    temperature: 0.1,
    specialties: ['Debugging', 'Strategy', 'Analysis'],
  },
  {
    id: 'alma-librarian',
    name: 'Alma Librarian',
    role: 'External Research',
    description: 'Conducts external research and gathers information from documentation and resources',
    icon: 'search',
    status: 'available',
    temperature: 0.3,
    specialties: ['Research', 'Documentation', 'Information Gathering'],
  },
  {
    id: 'alvaro-explore',
    name: 'Alvaro Explore',
    role: 'Codebase Navigator',
    description: 'Searches and explores codebases to find relevant files, patterns, and implementations',
    icon: 'compass',
    status: 'available',
    temperature: 0.5,
    specialties: ['Code Search', 'Pattern Recognition', 'Navigation'],
  },
  {
    id: 'dave-engineer',
    name: 'Dave Engineer',
    role: 'Frontend Specialist',
    description: 'Handles frontend development, UI/UX implementation, and React components',
    icon: 'code',
    status: 'available',
    temperature: 0.7,
    specialties: ['Frontend', 'React', 'UI/UX'],
  },
  {
    id: 'angeles-writer',
    name: 'Angeles Writer',
    role: 'Documentation',
    description: 'Creates and maintains documentation, specs, and technical writing',
    icon: 'file-text',
    status: 'available',
    temperature: 0.5,
    specialties: ['Documentation', 'Technical Writing', 'Specs'],
  },
];

function AgentCard({ agent }: { agent: Agent }) {
  const Icon = iconMap[agent.icon] || iconMap.default;

  const statusColors = {
    available: 'bg-emerald-500',
    busy: 'bg-amber-500',
    offline: 'bg-gray-500',
  };

  const statusLabels = {
    available: 'Available',
    busy: 'Busy',
    offline: 'Offline',
  };

  return (
    <Card className="p-4 hover:bg-terminal-elevated/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20">
            <Icon className="w-8 h-8 text-cyan-400" />
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-terminal-card ${statusColors[agent.status]}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-terminal-text">
              {agent.name}
            </h3>
            <span className="text-xs text-terminal-text-muted">
              T={agent.temperature}
            </span>
          </div>
          <p className="text-xs text-cyan-400 mb-2">{agent.role}</p>
          <p className="text-sm text-terminal-text-secondary mb-3">
            {agent.description}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {agent.specialties.map((specialty) => (
              <Badge key={specialty} variant="muted">
                {specialty}
              </Badge>
            ))}
          </div>
        </div>
        <div className="text-right">
          <span className={`text-xs ${agent.status === 'available' ? 'text-emerald-400' : 'text-terminal-text-muted'}`}>
            {statusLabels[agent.status]}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function Agents() {
  // Fetch agents
  const { data: agents = yoyoAgents, isLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      // Return default agents for now
      // In production, fetch status from /api/agents
      return yoyoAgents;
    },
  });

  const availableCount = agents.filter((a) => a.status === 'available').length;

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          <h1 className="panel-title">Agents</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">{availableCount} Available</Badge>
          <Badge variant="muted">{agents.length} Total</Badge>
        </div>
      </div>

      {/* Info banner */}
      <div className="p-4 border-b border-terminal-border">
        <Card className="p-4 bg-cyan-500/5 border-cyan-500/20">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-sm text-terminal-text">
                Agents are specialized AI assistants that handle different types of tasks.
              </p>
              <p className="text-xs text-terminal-text-secondary mt-1">
                The orchestrator automatically routes your requests to the best agent for the job.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Agents list */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        {agents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-terminal-text mb-2">
              No Agents Available
            </h2>
            <p className="text-sm text-terminal-text-secondary max-w-md">
              Agents will appear here once they are configured.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
