import { useQuery } from '@tanstack/react-query';
import {
  Zap,
  Code,
  FileSearch,
  MessageSquare,
  Database,
  Globe,
  Terminal,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { PageLoader } from '../components/common/LoadingSpinner';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: 'active' | 'learning' | 'inactive';
  usageCount: number;
  lastUsed?: string;
}

const iconMap: Record<string, React.ElementType> = {
  code: Code,
  search: FileSearch,
  chat: MessageSquare,
  database: Database,
  web: Globe,
  terminal: Terminal,
  default: Sparkles,
};

function SkillCard({ skill }: { skill: Skill }) {
  const Icon = iconMap[skill.icon] || iconMap.default;

  const statusColors = {
    active: 'bg-emerald-500/10 text-emerald-400',
    learning: 'bg-amber-500/10 text-amber-400',
    inactive: 'bg-gray-500/10 text-gray-400',
  };

  const statusIcons = {
    active: CheckCircle2,
    learning: Clock,
    inactive: Clock,
  };

  const StatusIcon = statusIcons[skill.status];

  return (
    <Card className="p-4 hover:bg-terminal-elevated/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-cyan-500/10">
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-terminal-text">
              {skill.name}
            </h3>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusColors[skill.status]}`}>
              <StatusIcon className="w-3 h-3" />
              {skill.status}
            </div>
          </div>
          <p className="text-xs text-terminal-text-secondary mb-3">
            {skill.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-terminal-text-muted">
            <span>Category: {skill.category}</span>
            <span>Used {skill.usageCount} times</span>
            {skill.lastUsed && (
              <span>Last used: {new Date(skill.lastUsed).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Default skills that come with Yoyo AI
const defaultSkills: Skill[] = [
  {
    id: 'code-generation',
    name: 'Code Generation',
    description: 'Generate code snippets, functions, and complete modules in various programming languages',
    category: 'Development',
    icon: 'code',
    status: 'active',
    usageCount: 0,
  },
  {
    id: 'codebase-search',
    name: 'Codebase Search',
    description: 'Search and analyze code across your project files and repositories',
    category: 'Development',
    icon: 'search',
    status: 'active',
    usageCount: 0,
  },
  {
    id: 'conversation',
    name: 'Natural Conversation',
    description: 'Engage in natural language conversations and answer questions',
    category: 'Communication',
    icon: 'chat',
    status: 'active',
    usageCount: 0,
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    description: 'Analyze data, generate insights, and create visualizations',
    category: 'Analysis',
    icon: 'database',
    status: 'active',
    usageCount: 0,
  },
  {
    id: 'web-research',
    name: 'Web Research',
    description: 'Search the web and gather information on various topics',
    category: 'Research',
    icon: 'web',
    status: 'learning',
    usageCount: 0,
  },
  {
    id: 'shell-commands',
    name: 'Shell Commands',
    description: 'Execute shell commands and automate terminal tasks',
    category: 'Automation',
    icon: 'terminal',
    status: 'active',
    usageCount: 0,
  },
];

export default function Skills() {
  // Fetch skills
  const { data: skills = defaultSkills, isLoading } = useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: async () => {
      // Return default skills for now
      // In production, merge with learned skills from /api/skills
      return defaultSkills;
    },
  });

  const categories = [...new Set(skills.map((s) => s.category))];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h1 className="panel-title">Skills</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">{skills.filter((s) => s.status === 'active').length} Active</Badge>
          <Badge variant="warning">{skills.filter((s) => s.status === 'learning').length} Learning</Badge>
        </div>
      </div>

      {/* Skills list */}
      <div className="flex-1 overflow-auto p-4">
        {categories.map((category) => (
          <div key={category} className="mb-6">
            <h2 className="text-sm font-semibold text-terminal-text-secondary mb-3">
              {category}
            </h2>
            <div className="space-y-3">
              {skills
                .filter((skill) => skill.category === category)
                .map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
            </div>
          </div>
        ))}

        {skills.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-terminal-text mb-2">
              No Skills Yet
            </h2>
            <p className="text-sm text-terminal-text-secondary max-w-md">
              Yoyo AI will learn new skills as you interact with it.
              Skills help the AI perform specific tasks more effectively.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
