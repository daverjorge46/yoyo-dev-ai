import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  Search,
  Calendar,
  Tag,
  FileText,
  Clock,
  Trash2,
  Plus,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { PageLoader } from '../components/common/LoadingSpinner';

interface Memory {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <Card className="p-4 hover:bg-terminal-elevated/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-terminal-text mb-1 truncate">
            {memory.title}
          </h3>
          <p className="text-xs text-terminal-text-secondary line-clamp-2 mb-3">
            {memory.content}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="primary">{memory.category}</Badge>
            {memory.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="muted">
                {tag}
              </Badge>
            ))}
            {memory.tags.length > 2 && (
              <span className="text-xs text-terminal-text-muted">
                +{memory.tags.length - 2} more
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-terminal-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(memory.createdAt).toLocaleDateString()}
          </span>
          <Button size="sm" variant="ghost" className="text-terminal-text-muted hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function Memory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch memories
  const { data: memories = [], isLoading } = useQuery<Memory[]>({
    queryKey: ['memories', searchQuery, selectedCategory],
    queryFn: async () => {
      // Placeholder - return empty array for now
      // In production, this would fetch from /api/memory
      return [];
    },
  });

  const categories = ['Personal', 'Work', 'Project', 'Learning', 'Reference'];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-400" />
          <h1 className="panel-title">Memory</h1>
        </div>
        <Button icon={<Plus className="w-4 h-4" />}>Add Memory</Button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-terminal-border space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-text-muted" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-terminal-elevated border border-terminal-border rounded-md text-terminal-text placeholder-terminal-text-muted focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-terminal-text-secondary">Filter:</span>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedCategory === null
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-terminal-elevated text-terminal-text-secondary hover:text-terminal-text'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === category
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-terminal-elevated text-terminal-text-secondary hover:text-terminal-text'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-auto p-4">
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-terminal-text mb-2">
              No Memories Yet
            </h2>
            <p className="text-sm text-terminal-text-secondary max-w-md mb-4">
              Yoyo AI will store important information and context from your
              conversations here for future reference.
            </p>
            <Button icon={<Plus className="w-4 h-4" />}>
              Add Your First Memory
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
